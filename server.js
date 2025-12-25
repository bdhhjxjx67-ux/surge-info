const express = require("express");
const axios = require("axios");
const path = require("path");
const compression = require("compression");
const minify = require("express-minify");
const { minify: htmlMinify } = require("html-minifier-terser");

const app = express();
const PORT = 3000;

app.use(compression());


app.use(minify());


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


app.use(express.static(path.join(__dirname, "public")));


app.use((req, res, next) => {
  const oldRender = res.render;
  res.render = async function (view, options) {
    oldRender.call(this, view, options, async (err, html) => {
      if (err) throw err;

      const minified = await htmlMinify(html, {
        collapseWhitespace: true,
        removeComments: true,
        minifyCSS: true,
        minifyJS: true,
      });

      res.send(minified);
    });
  };
  next();
});

const API_URL =
  "https://opensheet.elk.sh/1V-SZVz-6CcVZZXCNmN0U2Ssg-BFBp66TPlus9nmo2Ng/1";


app.get("/", async (req, res) => {
  const { data } = await axios.get(API_URL);
  res.render("index", { matches: data });
});


app.get("/stream/:league/:matchId/:slug", async (req, res) => {
  const { matchId } = req.params;
  const { data } = await axios.get(API_URL);

  const match = data.find(m => String(m.MatchID) === String(matchId));
  if (!match) return res.status(404).send("Not found");

  res.render("stream", { match });
});

app.get("/league/:league", async (req, res) => {
  try {
    const leagueParam = req.params.league.toLowerCase();
    const { data } = await axios.get(API_URL);

    const leagueMatches = data.filter(
      m => m.League && m.League.toLowerCase() === leagueParam
    );

    res.render("league", {
      league: leagueParam.toUpperCase(),
      matches: leagueMatches,   
      hasMatches: leagueMatches.length > 0
    });

  } catch (err) {
    console.error(err);
    res.send("Error loading league page");
  }
});

app.get("/contact", (req, res) => {
  res.render("contact");
});

app.get("/privacy", (req, res) => {
  res.render("privacy");
});

app.get("/dmca", (req, res) => {
  res.render("dmca");
});

app.get("/sitemap.xml", async (req, res) => {
  try {
    const siteUrl = "https://sportsurge.info";

    const { data } = await axios.get(API_URL);

    const leagues = [
      "nfl",
      "nba",
      "ufc",
      "mma",
      "mlb",
      "nhl",
      "soccer",
      "cfl",
      "wwe"
    ];

    let urls = [];

    urls.push(
      { loc: `${siteUrl}/`, changefreq: "weekly", priority: "1.0" },
      { loc: `${siteUrl}/privacy`, changefreq: "monthly", priority: "0.3" },
      { loc: `${siteUrl}/dmca`, changefreq: "monthly", priority: "0.3" },
      { loc: `${siteUrl}/contact`, changefreq: "monthly", priority: "0.3" }
    );

    leagues.forEach(league => {
      urls.push({
        loc: `${siteUrl}/league/${league}`,
        changefreq: "weekly",
        priority: "0.8"
      });
    });

    data.forEach(match => {
      const slug = `${match.Team1}-vs-${match.Team2}`
        .toLowerCase()
        .replace(/\s+/g, "-");

      urls.push({
        loc: `${siteUrl}/stream/${match.League.toLowerCase()}/${match.MatchID}/${slug}`,
        changefreq: "daily",
        priority: "0.9"
      });
    });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    urls.forEach(u => {
      xml += `
  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`;
    });

    xml += `\n</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);

  } catch (err) {
    console.error(err);
    res.status(500).send("Sitemap Error");
  }
});

app.listen(PORT, () =>
  console.log(`Running → http://localhost:${PORT}`)
);
