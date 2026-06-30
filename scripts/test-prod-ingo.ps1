$BaseUrl = "https://beelab-api.nathabee.de"
$Tenant = "ingo"
$ClientId = "ingo-client"
$ClientSecret = "ingo-secret"

$tokenResponse = Invoke-RestMethod `
    -Method POST `
    -Uri "$BaseUrl/api/GetToken/$Tenant" `
    -ContentType "application/json" `
    -Body (@{
        client_id     = $ClientId
        client_secret = $ClientSecret
    } | ConvertTo-Json)

$token = $tokenResponse.access_token

Write-Host "Token received."

$body = @{
    projectName   = "ImportProject"
    projectNumber = "1000"
    location = @{
        address = @{
            streetName   = "Musterstrasse"
            streetNumber = "1"
            city         = "Musterstadt"
            state        = "Hessen"
            postalCode   = "64750"
            country      = "deu"
        }
    }
    localContact = @{
        localContactName  = "Max Mustermann"
        localContactPhone = "+49 123456789"
    }
    startDate = "2026-07-01"
    nuLevel   = 2
}

$response = Invoke-RestMethod `
    -Method POST `
    -Uri "$BaseUrl/api/projectimport" `
    -Headers @{
        Authorization = "Bearer $token"
    } `
    -ContentType "application/json" `
    -Body ($body | ConvertTo-Json -Depth 10)

$response | ConvertTo-Json -Depth 10