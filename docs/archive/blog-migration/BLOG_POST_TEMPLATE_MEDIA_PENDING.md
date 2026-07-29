# Blog Post Template Media Pending

Task 2A uses only two controlled fixture posts. The route reads committed fixture
data, but several post media fields still point at Webflow CDN URLs until the
later Blog media localisation pass.

| Post slug | Field / position | Current source URL | Media type | Intended final destination | Localisation status |
| --- | --- | --- | --- | --- | --- |
| `how-it-all-started-and-almost-didnt` | Hero thumbnail | `https://cdn.prod.website-files.com/679b76839dcb6eaedc2021a0/681220e76fdf3c4be10244f8_How%20It%20All%20Started%20and%20Almost%20Didn%E2%80%99t_Founders%20Diary.webp` | WebP image | `public/assets/blog/` or future CMS asset | Pending |
| `how-it-all-started-and-almost-didnt` | Open Graph image | `https://cdn.prod.website-files.com/679b76839dcb6eaedc2021a0/681222f1ccb28aab65e632d4_open-graph-3.png` | PNG image | `public/assets/blog/` or future CMS asset | Pending |
| `circuit-securing-nexubis` | Hero thumbnail / Lottie fallback | `https://cdn.prod.website-files.com/679b76839dcb6eaedc2021a0/690c57e7ba3e964b48906644_Nexubis%20Blogs-Our%20Clients_Circuit%20(1).png` | PNG image | `public/assets/blog/` or future CMS asset | Pending |
| `circuit-securing-nexubis` | Open Graph image | `https://cdn.prod.website-files.com/679b76839dcb6eaedc2021a0/690c57e7ba3e964b48906644_Nexubis%20Blogs-Our%20Clients_Circuit%20(1).png` | PNG image | `public/assets/blog/` or future CMS asset | Pending |
| `circuit-securing-nexubis` | Hero Lottie JSON | Committed fixture JSON generated from Webflow CMS field | Lottie JSON | Future CMS field or local asset module | Temporarily committed as Task 2A fixture |
| `circuit-securing-nexubis` | Showreel embed | `https://youtu.be/WKUUu8J0xYg` | YouTube video | Future CMS field | External embed retained |
