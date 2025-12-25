const express = require("express");
const axios = require("axios");
const path = require("path");
const compression = require("compression");

const app = express();
const PORT = process.env.PORT || 3000;


app.use(compression());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

const API_URL =
  "https://opensheet.elk.sh/1V-SZVz-6CcVZZXCNmN0U2Ssg-BFBp66TPlus9nmo2Ng/1";


app.get("/", async (req, res) => {
  try {
    const { data } = await axios.get(API_URL);
    res.render("index", { matches: data });
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

app.get("/stream/:league/:matchId/:slug", async (req, res) => {
  try {
    const { matchId } = req.params;
    const { data } = await axios.get(API_URL);

    const match = data.find(m => String(m.MatchID) === String(matchId));
    if (!match) return res.status(404).send("Match not found");

    res.render("stream", { match });
  } catch (err) {
    res.status(500).send("Server Error");
  }
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
    res.status(500).send("Server Error");
  }
});

app.get("/contact", (req, res) => res.render("contact"));
app.get("/privacy", (req, res) => res.render("privacy"));
app.get("/dmca", (req, res) => res.render("dmca"));



app.get("/sitemap.xml", async (req, res) => {
  try {
    const siteUrl = "https://sportsurge.info";
    const { data } = await axios.get(API_URL);

    const leagues = [
      "nfl", "nba", "ufc", "mma",
      "mlb", "nhl", "soccer", "cfl", "wwe"
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

    res.set("Content-Type", "application/xml");
    res.send(xml);

  } catch (err) {
    res.status(500).send("Sitemap Error");
  }
});



app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
