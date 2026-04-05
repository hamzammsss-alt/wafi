using Wafi.Core.Entities;

namespace Wafi.Core.Interfaces
{
    public interface ITokenService
    {
        string CreateToken(User user);
    }
}
