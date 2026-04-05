$sess = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$resp = Invoke-WebRequest -Uri "http://localhost:3000/" -WebSession $sess -UseBasicParsing
$csrf = [regex]::Match($resp.Content, 'name="_csrf" value="([^"]+)"').Groups[1].Value
if (-not $csrf) { throw "No csrf token found" }
$body = @{ email='admin@admin.com'; password='admin123'; _csrf=$csrf }
try {
  $login = Invoke-WebRequest -Uri "http://localhost:3000/login" -Method Post -Body $body -WebSession $sess -MaximumRedirection 0 -ErrorAction Stop
  Write-Output ("LOGIN_STATUS=" + $login.StatusCode)
} catch {
  if ($_.Exception.Response) {
    $code = [int]$_.Exception.Response.StatusCode
    Write-Output ("LOGIN_STATUS=" + $code)
    $loc = $_.Exception.Response.Headers['Location']
    if ($loc) { Write-Output ("LOGIN_LOCATION=" + $loc) }
  } else {
    throw
  }
}
