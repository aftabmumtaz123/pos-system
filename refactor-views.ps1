# Script to refactor all EJS view files to use proper includes

$viewsPath = "E:\Jamshaid\pos-system\views"

# Function to extract content between body tags
function Get-BodyContent {
    param($content)
    
    # Find the start of the body content (after <%- include)
    if ($content -match '<%- include\([^)]+body: `([^`]+)`') {
        return $matches[1]
    }
    return $null
}

Write-Host "EJS View Refactoring Script"
Write-Host "This script will convert template string includes to proper EJS includes"
Write-Host ""
Write-Host "Files that need manual refactoring:"
Write-Host "- All admin/*.ejs files"
Write-Host "- All cashier/*.ejs files"
Write-Host ""
Write-Host "Pattern to replace:"
Write-Host '  FROM: <%- include("../layouts/main", { user, currentPage, body: `...` }) %>'
Write-Host "  TO:   <%- include('../layouts/header', { user, currentPage, title }) %>"
Write-Host "        ... content ..."
Write-Host "        <%- include('../layouts/footer') %>"
