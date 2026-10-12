import { useAuth } from './useAuth';

/**
 * useObjectPermissions(objectApiName)
 *
 * Returns object-level and field-level permissions for the current user
 * on the given object. Superusers and admins always get full access.
 *
 * Returns:
 *   canCreate, canRead, canUpdate, canDelete, canExport, canImport  {boolean}
 *   canViewField(fieldApiName)   {(string) => boolean}
 *   canEditField(fieldApiName)   {(string) => boolean}
 *   fieldPermissions             {Array}
 */
export function useObjectPermissions(objectApiName) {
  const { user, isAdmin, isSuperuser } = useAuth();

  // Superuser / admin — unrestricted
  if (isSuperuser || isAdmin) {
    return {
      canCreate:  true,
      canRead:    true,
      canUpdate:  true,
      canDelete:  true,
      canExport:  true,
      canImport:  true,
      canViewField:  () => true,
      canEditField:  () => true,
      fieldPermissions: [],
    };
  }

  // No role assigned — no access
  const perm = user?.role?.objectPermissions?.find(p => p.objectApiName === objectApiName);
  if (!perm) {
    return {
      canCreate:  false,
      canRead:    false,
      canUpdate:  false,
      canDelete:  false,
      canExport:  false,
      canImport:  false,
      canViewField:  () => true,  // don't hide fields for no-role users (they can't access the page anyway)
      canEditField:  () => true,
      fieldPermissions: [],
    };
  }

  const fps = perm.fieldPermissions || [];

  return {
    canCreate:  !!perm.canCreate,
    canRead:    !!perm.canRead,
    canUpdate:  !!perm.canUpdate,
    canDelete:  !!perm.canDelete,
    canExport:  !!perm.canExport,
    canImport:  !!perm.canImport,

    canViewField: (fieldApiName) => {
      const fp = fps.find(f => f.fieldApiName === fieldApiName);
      return !fp || fp.canView !== false;
    },

    canEditField: (fieldApiName) => {
      const fp = fps.find(f => f.fieldApiName === fieldApiName);
      return !fp || fp.canEdit !== false;
    },

    fieldPermissions: fps,
  };
}
