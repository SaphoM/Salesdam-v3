/**
 * Helpers for turning the OpenAPI document into something renderable.
 *
 * All of this runs at build time in Astro frontmatter, so the browser receives
 * plain markup and pre-built example payloads rather than a spec parser.
 */

/** Follow a local `$ref` like `#/components/schemas/Record`. */
function refTarget(spec, ref) {
  return ref
    .replace(/^#\//, '')
    .split('/')
    .reduce((node, key) => (node == null ? node : node[key]), spec);
}

/**
 * Fully resolve `$ref`s and flatten `allOf` into a plain schema.
 *
 * `seen` guards against cycles: schemas here are shallow, but a self-referencing
 * one (a record whose property is a record) would otherwise recurse forever and
 * hang the build rather than failing loudly.
 */
export function deref(spec, schema, seen = new Set(), depth = 0) {
  if (!schema || typeof schema !== 'object' || depth > 8) return schema || {};

  if (schema.$ref) {
    if (seen.has(schema.$ref)) return { type: 'object', description: 'circular reference' };
    const next = new Set(seen).add(schema.$ref);
    return deref(spec, refTarget(spec, schema.$ref), next, depth + 1);
  }

  if (Array.isArray(schema.allOf)) {
    // Merge members left to right; later members win on conflict, and
    // `properties` are unioned rather than replaced.
    return schema.allOf.reduce(
      (acc, part) => {
        const r = deref(spec, part, seen, depth + 1);
        return {
          ...acc,
          ...r,
          properties: { ...(acc.properties || {}), ...(r.properties || {}) },
          required: [...(acc.required || []), ...(r.required || [])],
        };
      },
      { type: 'object' },
    );
  }

  const out = { ...schema };
  if (schema.properties) {
    out.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([k, v]) => [k, deref(spec, v, seen, depth + 1)]),
    );
  }
  if (schema.items) out.items = deref(spec, schema.items, seen, depth + 1);
  return out;
}

/** A short, human type label: `string`, `array of string`, `enum`, … */
export function typeLabel(schema) {
  if (!schema) return 'any';
  if (schema.enum) return schema.enum.length <= 4 ? schema.enum.join(' | ') : 'enum';
  if (schema.type === 'array') return `array of ${typeLabel(schema.items) || 'any'}`;
  if (schema.format) return `${schema.type} (${schema.format})`;
  return schema.type || (schema.properties ? 'object' : 'any');
}

/**
 * Build a realistic example value for a schema.
 *
 * Prefers an author-supplied `example`, then the first `enum` member, then a
 * type-appropriate placeholder — so the Try-it body is pre-filled with something
 * that will actually pass validation rather than `{}`.
 */
export function exampleFor(schema, depth = 0) {
  if (!schema || depth > 6) return null;
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum?.length) return schema.enum[0];

  switch (schema.type) {
    case 'object': {
      if (!schema.properties) return {};
      return Object.fromEntries(
        Object.entries(schema.properties).map(([k, v]) => [k, exampleFor(v, depth + 1)]),
      );
    }
    case 'array':
      return [exampleFor(schema.items, depth + 1)].filter((v) => v !== null);
    case 'integer':
      return 0;
    case 'number':
      return 0;
    case 'boolean':
      return true;
    case 'string':
      if (schema.format === 'date-time') return '2026-08-19T09:00:00.000Z';
      if (schema.format === 'email') return 'user@example.com';
      if (schema.format === 'password') return '••••••••';
      if (schema.format === 'binary') return '<file>';
      return 'string';
    default:
      return null;
  }
}

/**
 * Flatten an object schema one level into table rows, with a second level for
 * nested objects so a reader can see shapes like `pagination.total` without
 * expanding anything. Deeper nesting is left to the example payload.
 */
export function schemaRows(schema, prefix = '', depth = 0) {
  if (!schema?.properties || depth > 1) return [];
  const required = new Set(schema.required || []);

  return Object.entries(schema.properties).flatMap(([name, prop]) => {
    const path = prefix ? `${prefix}.${name}` : name;
    const row = {
      name: path,
      type: typeLabel(prop),
      required: required.has(name),
      description: prop.description || '',
      enum: prop.enum || null,
    };
    const nested =
      prop.type === 'object' && prop.properties
        ? schemaRows(prop, path, depth + 1)
        : prop.type === 'array' && prop.items?.properties
          ? schemaRows(prop.items, `${path}[]`, depth + 1)
          : [];
    return [row, ...nested];
  });
}

/** The request body schema and example for an operation, or null. */
export function requestBodyOf(spec, op) {
  const content = op.requestBody?.content;
  if (!content) return null;
  const mediaType = Object.keys(content)[0];
  const media = content[mediaType];
  const schema = deref(spec, media.schema);
  return {
    mediaType,
    schema,
    required: op.requestBody.required === true,
    example: media.example !== undefined ? media.example : exampleFor(schema),
    rows: schemaRows(schema),
  };
}

/** Responses as a sorted, renderable list. */
export function responsesOf(spec, op) {
  return Object.entries(op.responses || {})
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([status, res]) => {
      const resolved = res.$ref ? deref(spec, res) : res;
      const content = resolved.content;
      const mediaType = content ? Object.keys(content)[0] : null;
      const schema = mediaType ? deref(spec, content[mediaType].schema) : null;
      return {
        status,
        description: resolved.description || '',
        example: schema ? exampleFor(schema) : null,
        rows: schema ? schemaRows(schema) : [],
      };
    });
}

/** Split parameters by location, resolving any `$ref`d ones. */
export function paramsOf(spec, op) {
  const all = (op.parameters || []).map((p) => (p.$ref ? refTarget(spec, p.$ref) : p));
  return {
    path: all.filter((p) => p.in === 'path'),
    query: all.filter((p) => p.in === 'query'),
    header: all.filter((p) => p.in === 'header'),
  };
}
