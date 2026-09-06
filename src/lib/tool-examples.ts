/** Public, deliberately non-production fixtures for tools that start empty. */
export const TOOL_EXAMPLES: Record<string, string> = {
	"jwt-debugger":
		"eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJkZW1vIiwibmFtZSI6IkFsZXgiLCJleHAiOjE3MDAwMDAwMDB9.",
	"uuid-ulid": "550e8400-e29b-41d4-a716-446655440000",
	"base64-image":
		"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z7dsAAAAASUVORK5CYII=",
	"certificate-decoder": `-----BEGIN CERTIFICATE-----
MIIBdTCCASegAwIBAgIUXB9kZPmFM4/4ckElGmeI3fvnqhYwBQYDK2VwMDAxFDAS
BgNVBAMMC2V4YW1wbGUuY29tMRgwFgYDVQQKDA91dXRpbCBEZW1vIE9ubHkwHhcN
MjYwOTA2MjMxNjI2WhcNMjcwOTA2MjMxNjI2WjAwMRQwEgYDVQQDDAtleGFtcGxl
LmNvbTEYMBYGA1UECgwPdXV0aWwgRGVtbyBPbmx5MCowBQYDK2VwAyEAFbifgXyO
isvCJk7sPGJeThepkGIjxLNlrZQzKYiFY+ejUzBRMB0GA1UdDgQWBBTEnT9zTrGd
Der3QlzhrTfvlv2lmDAfBgNVHSMEGDAWgBTEnT9zTrGdDer3QlzhrTfvlv2lmDAP
BgNVHRMBAf8EBTADAQH/MAUGAytlcANBACh78s//BhDqZYCWtCituvA3X+N9+TRS
FTtLQ0WuqsfZL4PMrNvE25QTEMwFmqUJ3w5UI5nqMWCvuUNb5X7jqws=
-----END CERTIFICATE-----`,
};
export const TOOL_HELP: Record<string, string> = {
	"json-schema-validator":
		"Choose draft 4, 6, or 7. Click an error path to select the exact value in the source document. External schema URLs are not fetched. Validation is time-limited to protect the browser.",
	"text-redactor":
		"Redaction is pattern-based, not a guarantee that every secret is removed. IPv4 and common phone formats are supported; manually inspect IPv6 addresses and unusual secret formats.",
	"mock-data-generator":
		"Define one field per line as name:type. Choose a seed for reproducible fixtures, then generate JSON or CSV. Emails always use the reserved example.com domain.",
	"color-contrast-checker":
		"Use opaque CSS colors. AA normal text needs 4.5:1, large text needs 3:1, and AAA normal text needs 7:1. Select an alternative to apply it to the preview.",
	"cron-builder":
		"Cron intervals restart every hour, so every 40 minutes runs at :00 and :40. The preview timezone does not change the expression; set the same timezone in your scheduler.",
	"jwt-debugger":
		"Decoding does not verify a token's signature. The built-in example is unsigned and expired on purpose. Never treat decoded claims as proof of authentication.",
	"certificate-decoder":
		"Paste a PEM CERTIFICATE block, never a private key. The example is a self-signed demo certificate, not a trusted identity. Decoding metadata does not validate a certificate chain.",
	"base64-image":
		"Choose an image to encode, or paste a Base64 image data URL to decode. The built-in example is a one-pixel PNG.",
};
