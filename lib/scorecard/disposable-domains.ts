// Bundled disposable / throwaway email domains (a curated subset of the common
// public lists). Blocking these keeps junk out of the Funnelr sequence. Refresh
// periodically from a maintained source (e.g. disposable-email-domains on
// GitHub); this set covers the high-frequency offenders without shipping a
// multi-thousand-entry file.
export const DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set([
  "0-mail.com", "0clickemail.com", "10minutemail.com", "10minutemail.net", "20minutemail.com",
  "33mail.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "guerrillamail.biz",
  "guerrillamailblock.com", "sharklasers.com", "grr.la", "spam4.me", "mailinator.com",
  "mailinator.net", "mailinator2.com", "notmailinator.com", "reallymymail.com", "trashmail.com",
  "trashmail.net", "trash-mail.com", "trashmail.de", "kurzepost.de", "objectmail.com",
  "proxymail.eu", "rcpt.at", "tempmail.com", "temp-mail.org", "temp-mail.ru",
  "tempmailo.com", "tempinbox.com", "tempemail.com", "tempemail.net", "throwawaymail.com",
  "throwawayemail.com", "yopmail.com", "yopmail.net", "yopmail.fr", "cool.fr.nf",
  "jetable.com", "jetable.org", "nospam.ze.tc", "nomail.xl.cx", "mega.zik.dj",
  "speed.1s.fr", "courriel.fr.nf", "moncourrier.fr.nf", "monemail.fr.nf", "monmail.fr.nf",
  "getairmail.com", "getnada.com", "nada.email", "dispostable.com", "fakeinbox.com",
  "fakemailgenerator.com", "mailnesia.com", "mailcatch.com", "maildrop.cc", "mailnull.com",
  "spamgourmet.com", "mintemail.com", "mytemp.email", "mohmal.com", "emailondeck.com",
  "33mail.net", "anonbox.net", "deadaddress.com", "despam.it", "discard.email",
  "discardmail.com", "discardmail.de", "spambog.com", "spambox.us", "tempr.email",
  "tmail.ws", "tmailinator.com", "wegwerfmail.de", "wegwerfmail.net", "wegwerfmail.org",
  "luxusmail.org", "burnermail.io", "inboxbear.com", "tempmail.plus",
  "1secmail.com", "1secmail.org", "1secmail.net", "emailfake.com", "fakemail.net",
  "harakirimail.com", "incognitomail.org", "mailexpire.com", "spamfree24.org", "trbvm.com",
]);
