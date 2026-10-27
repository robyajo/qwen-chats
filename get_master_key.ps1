
Add-Type -AssemblyName System.Security
 = Get-Content 'C:\Users\robyk\AppData\Roaming\Qwen\Local State' -Raw | ConvertFrom-Json
 = .os_crypt.encrypted_key
 = [System.Convert]::FromBase64String()
 = [5..(.Length - 1)]
 = [System.Security.Cryptography.ProtectedData]::Unprotect(, , [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
Write-Output ([System.BitConverter]::ToString() -replace '-','')
