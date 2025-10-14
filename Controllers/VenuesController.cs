// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.
// See the LICENSE file in the project root for more information.

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

using ARCompletions.Dto;
namespace ARCompletions.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class VenuesController : ControllerBase
    {
        private readonly Data.ARCompletionsContext _context;

        public VenuesController(Data.ARCompletionsContext context)
        {
            _context = context;
        }

        // POST /venues/complete
        [HttpPost("complete")]
    public IActionResult Complete([FromBody] CompleteRequestDto req)
        {
            if (req == null || string.IsNullOrEmpty(req.venuesid) || string.IsNullOrEmpty(req.userid))
                return BadRequest("Invalid request");

            var completion = new Data.Completion
            {
                VenuesId = req.venuesid,
                UserId = req.userid,
                Complate = req.complate == 1,
                CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            };
            try
            {
                _context.Completions.Add(completion);
                _context.SaveChanges();

                return Ok(new {
                    venuesid = completion.VenuesId,
                    userid = completion.UserId,
                    complate = completion.Complate ? 1 : 0,
                    createdAt = completion.CreatedAt
                });
            }
            catch
            {
                return StatusCode(500, "Database error");
            }
        }

        // GET /venues/{userId}
        [HttpGet("{userId}")]
        public IActionResult GetUserVenues(string userId)
        {
            if (string.IsNullOrEmpty(userId))
                return BadRequest("Invalid userId");

            // 固定 requiredVenues 清單
            var requiredVenues = new[] { "venue01", "venue02", "venue03", "venue04", "venue05", "venue06", "venue07", "venue08", "venue09", "venue10", "venue11", "venue12", "venue13", "venue14", "venue15" };
            var completedVenues = _context.Completions
                .Where(c => c.UserId == userId && c.Complate)
                .Select(c => c.VenuesId)
                .Distinct()
                .ToList();
            var completedVenuesResult = completedVenues.ToList();

            var couponList = new[] {
                new { vendorid = "test-vendor", imgurl = "https://example.com/coupon.png" }
            };
            return Ok(new
            {
                completedVenues = completedVenuesResult,
                coupon = couponList,
                requiredVenues,
                doneCount = completedVenuesResult.Count,
                totalRequired = requiredVenues.Length
            });
        }
    }
}
