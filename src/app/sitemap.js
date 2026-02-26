const base = "https://www.oriondiamonds.in";

export default function sitemap() {
  return [
    { url: base,                              changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/rings`,                   changeFrequency: "weekly",  priority: 0.9 },
    { url: `${base}/earrings`,                changeFrequency: "weekly",  priority: 0.9 },
    { url: `${base}/bracelets`,               changeFrequency: "weekly",  priority: 0.9 },
    { url: `${base}/pendants`,                changeFrequency: "weekly",  priority: 0.9 },
    { url: `${base}/about`,                   changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/faqs`,                    changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/customize`,               changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/contact`,                 changeFrequency: "yearly",  priority: 0.5 },
    { url: `${base}/policies/returns`,        changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/policies/shipping`,       changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/policies/privacy`,        changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/policies/terms`,          changeFrequency: "yearly",  priority: 0.3 },
  ];
}
