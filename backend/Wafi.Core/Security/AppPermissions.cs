namespace Wafi.Core.Security
{
    public static class AppPermissions
    {
        public static class Auth
        {
            public const string Me = "auth.me";
        }

        public static class Roles
        {
            public const string Read = "roles.read";
            public const string Manage = "roles.manage";
        }

        public static class Users
        {
            public const string Read = "users.read";
            public const string Manage = "users.manage";
            public const string ResetPassword = "users.reset-password";
        }

        public static class Tenants
        {
            public const string Read = "tenants.read";
            public const string Create = "tenants.create";
        }

        public static class Sync
        {
            public const string Push = "sync.push";
            public const string Pull = "sync.pull";
        }
    }
}
