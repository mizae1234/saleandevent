import { getRolePermissions } from "@/actions/role-permission-actions";
import RolePermissionsClient from "./RolePermissionsClient";

export default async function AdminUsersPage() {
    const permissions = await getRolePermissions();

    const initialPermissions = permissions.map((p: { role: string; allowedMenus: unknown }) => ({
        role: p.role,
        allowedMenus: p.allowedMenus as string[],
    }));

    return <RolePermissionsClient initialPermissions={initialPermissions} />;
}
