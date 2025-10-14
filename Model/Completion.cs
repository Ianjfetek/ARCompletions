using System;
using System.ComponentModel.DataAnnotations;

namespace ARCompletions.Data
{
    public class Completion
    {
        [Key]
        public string Id { get; set; } // TEXT, UUID

        public string VenuesId { get; set; } // TEXT, 場地

        public string UserId { get; set; } // TEXT, 使用者

        public bool Complate { get; set; } // BOOL, 完成度

        public long CreatedAt { get; set; } // INTEGER, 建立時間 (Unix timestamp)

        public Completion()
        {
            Id = Guid.NewGuid().ToString();
        }
    }
}
