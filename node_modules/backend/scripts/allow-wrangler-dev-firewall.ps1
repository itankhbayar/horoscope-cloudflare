# Run in PowerShell *as Administrator* so phones on your LAN can reach Wrangler (port 8787).
# Re-run anytime after Windows updates; it replaces the rule so profiles stay correct.
#
# Wi‑Fi is often "Public" on Windows — older versions of this script only allowed Private/Domain,
# which does NOT apply and you still get timeouts from your phone.

$ruleName = "Astralis Wrangler dev 8787 TCP inbound"

Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

New-NetFirewallRule `
  -DisplayName $ruleName `
  -Direction Inbound `
  -Action Allow `
  -Protocol TCP `
  -LocalPort 8787 `
  -Profile Any | Out-Null

Write-Host "OK: $ruleName — TCP 8787 inbound allowed on all network profiles (Private/Public/Domain)."
Write-Host "Restart Wrangler: cd backend && npm run dev"
