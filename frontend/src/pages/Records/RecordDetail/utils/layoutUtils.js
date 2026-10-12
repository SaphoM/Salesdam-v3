/**
 * Convert layout columnData (column-major order) to row-major order
 * so fields are positioned correctly in a CSS grid.
 *
 * Example with 2 columns:
 *   columnData[0].fields = [A, B, C]
 *   columnData[1].fields = [D, E, F]
 *
 * flatMap gives [A, B, C, D, E, F] → grid renders A|B, C|D, E|F  ✗
 * interleave gives [A, D, B, E, C, F] → grid renders A|D, B|E, C|F  ✓
 *
 * Empty slots are filled with null so placeholder divs maintain grid positions.
 */
export const interleaveColumns = (columnData = []) => {
  const numCols = columnData.length;
  if (numCols === 0) return [];

  const maxRows = Math.max(
    ...columnData.map((col) => (col.fields || []).length),
    0,
  );
  const items = [];

  for (let row = 0; row < maxRows; row++) {
    for (let colIdx = 0; colIdx < numCols; colIdx++) {
      const fieldItem = (columnData[colIdx].fields || [])[row] || null;
      items.push({ fieldItem, colIdx, row });
    }
  }

  return items;
};
