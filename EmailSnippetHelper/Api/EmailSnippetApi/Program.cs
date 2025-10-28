var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowChromeExtension", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowChromeExtension");
app.UseHttpsRedirection();

// In-memory storage for snippets (in production, use a database)
List<string> snippets = new List<string>
{
    "Hello, hope you're doing well!",
    "Thank you for reaching out.",
    "Best regards,",
    "Looking forward to hearing from you.",
    "Please let me know if you have any questions."
};

// Get all snippets
app.MapGet("/api/snippets", () =>
{
    return Results.Ok(snippets);
})
.WithName("GetSnippets")
.WithOpenApi();

// Add new snippet
app.MapPost("/api/snippets", async (HttpContext context) =>
{
    try
    {
        var newSnippet = await context.Request.ReadFromJsonAsync<string>();
        if (string.IsNullOrWhiteSpace(newSnippet))
        {
            return Results.BadRequest("Snippet cannot be empty");
        }
        
        snippets.Add(newSnippet);
        return Results.Ok(snippets);
    }
    catch (Exception ex)
    {
        return Results.BadRequest($"Error adding snippet: {ex.Message}");
    }
})
.WithName("AddSnippet")
.WithOpenApi();

// Update snippet by index
app.MapPut("/api/snippets/{index}", async (int index, HttpContext context) =>
{
    try
    {
        if (index < 0 || index >= snippets.Count)
        {
            return Results.NotFound("Snippet not found");
        }
        
        var updatedSnippet = await context.Request.ReadFromJsonAsync<string>();
        if (string.IsNullOrWhiteSpace(updatedSnippet))
        {
            return Results.BadRequest("Snippet cannot be empty");
        }
        
        snippets[index] = updatedSnippet;
        return Results.Ok(snippets);
    }
    catch (Exception ex)
    {
        return Results.BadRequest($"Error updating snippet: {ex.Message}");
    }
})
.WithName("UpdateSnippet")
.WithOpenApi();

// Delete snippet by index
app.MapDelete("/api/snippets/{index}", (int index) =>
{
    if (index < 0 || index >= snippets.Count)
    {
        return Results.NotFound("Snippet not found");
    }
    
    snippets.RemoveAt(index);
    return Results.Ok(snippets);
})
.WithName("DeleteSnippet")
.WithOpenApi();

// Health check endpoint
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
.WithName("HealthCheck")
.WithOpenApi();

app.Run();
