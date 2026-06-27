/** Client-safe country/marketplace constants (no server-only imports). */

/** Maps a country name to its Amazon marketplace domain (ported from n8n). */
export const COUNTRY_TO_AMAZON_DOMAIN: Record<string, string> = {
  Canada: "amazon.ca",
  "United States": "amazon.com",
  USA: "amazon.com",
  "United Kingdom": "amazon.co.uk",
  UK: "amazon.co.uk",
  Australia: "amazon.com.au",
  Germany: "amazon.de",
  France: "amazon.fr",
  Italy: "amazon.it",
  Spain: "amazon.es",
  Japan: "amazon.co.jp",
  India: "amazon.in",
  Mexico: "amazon.com.mx",
  Brazil: "amazon.com.br",
  Netherlands: "amazon.nl",
  Sweden: "amazon.se",
  Poland: "amazon.pl",
  Belgium: "amazon.com.be",
  Singapore: "amazon.sg",
  Turkey: "amazon.com.tr",
  "United Arab Emirates": "amazon.ae",
  "Saudi Arabia": "amazon.sa",
};

export const DISCOVERY_COUNTRIES = Object.keys(COUNTRY_TO_AMAZON_DOMAIN).filter(
  (c) => c !== "USA" && c !== "UK",
);
