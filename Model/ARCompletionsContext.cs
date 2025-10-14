using Microsoft.EntityFrameworkCore;

namespace ARCompletions.Data
{
    public class ARCompletionsContext : DbContext
    {
        public ARCompletionsContext(DbContextOptions<ARCompletionsContext> options)
            : base(options)
        {
        }

        public DbSet<Completion> Completions { get; set; }
    }
}
