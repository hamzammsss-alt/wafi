using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Wafi.Core.Entities;
using Wafi.Core.Interfaces;
using Wafi.Infrastructure.Data;

namespace Wafi.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ITokenService _tokenService;

        public AuthController(ApplicationDbContext context, ITokenService tokenService)
        {
            _context = context;
            _tokenService = tokenService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto login)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == login.Username);
            
            // In real app: Verify Password Hash (e.g., BCrypt/Argon2) using a service
            if (user == null || user.PasswordHash != login.Password) 
            {
                return Unauthorized("Invalid credentials");
            }

            if (!user.IsActive) return Unauthorized("User account is inactive");

            var token = _tokenService.CreateToken(user);

            return Ok(new 
            { 
                Token = token, 
                User = new { user.Username, user.Email, user.Role, user.TenantId } 
            });
        }
    }

    public class LoginDto 
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}
