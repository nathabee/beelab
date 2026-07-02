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
            state        = "Musterbundesland"
            postalCode   = "123456"
            country      = "deu"
        }
        coordinates = "8.0, 54.0"
    }
    localContact = @{
        localContactName  = "Karl Kontakt"
        localContactPhone = "+49 30 123456"
    }
    firstResponder = @{
        firstResponderName   = "Emil Erster"
        firstResponderNumber = "+49 30 321321"
    }
    fireDepartment = @{
        fireDepartmentName   = "Fabian Feuer"
        fireDepartmentNumber = "+49 30 987987"
    }
    startDate = "2024-03-25"
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
