# Email Snippet Helper

A simple and fast Chrome Extension to save and insert reusable email snippets, along with an optional ASP.NET Core API for future cloud sync.

## Features
- Save unlimited email snippets (stored locally via chrome.storage.sync)
- One-click insert into Gmail and textareas
- Delete and manage snippets easily
- Clean UI with status messages
- Optional .NET 9 API project scaffolded for future sync

## Repository structure
- EmailSnippetHelper/Extension/: Production Chrome Extension
- Extension/: Duplicate working copy (can remove later if not needed)
- EmailSnippetHelper/Api/EmailSnippetApi/: ASP.NET Core API project (optional)

## Install - Chrome Extension
1. Open Chrome and go to chrome://extensions
2. Enable " Developer "mode
3. Click Load" "unpacked and select EmailSnippetHelper/Extension
4. Pin the extension and click the icon to manage snippets

## Usage
- Add a snippet in the popup
- Click Insert to paste into the active email compose box (Gmail supported)

## Development
- Frontend: Plain JS/HTML/CSS
- API: .NET 9 Web API (Program.cs scaffolded)

## Build API (optional)
- Open the solution folder in your terminal
- Run: dotnet run --project EmailSnippetHelper/Api/EmailSnippetApi/EmailSnippetApi.csproj

## Contributing
Pull requests are welcome.

## License
MIT
