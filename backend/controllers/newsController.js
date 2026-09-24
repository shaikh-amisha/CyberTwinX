const https = require("https");
const { XMLParser } = require("fast-xml-parser");

const RSS_FEEDS = [
    {
        name: "BleepingComputer",
        url: "https://www.bleepingcomputer.com/feed/"
    }
];


/* =========================================================
   FETCH RSS
   ========================================================= */

function fetchRSS(url) {

    return new Promise((resolve, reject) => {

        const request = https.get(
            url,
            {
                headers: {
                    "User-Agent":
                        "CyberTwinX/1.0",
                    "Accept":
                        "application/rss+xml, application/xml, text/xml"
                }
            },
            response => {

                let data = "";

                response.setEncoding("utf8");

                response.on(
                    "data",
                    chunk => {
                        data += chunk;
                    }
                );

                response.on(
                    "end",
                    () => {

                        if (
                            response.statusCode < 200 ||
                            response.statusCode >= 300
                        ) {

                            reject(
                                new Error(
                                    `RSS HTTP ${response.statusCode}`
                                )
                            );

                            return;
                        }

                        resolve(data);

                    }
                );

            }
        );


        request.setTimeout(
            15000,
            () => {

                request.destroy(
                    new Error(
                        "RSS connection timeout"
                    )
                );

            }
        );


        request.on(
            "error",
            error => {
                reject(error);
            }
        );

    });

}


/* =========================================================
   CLEAN HTML
   ========================================================= */

function stripHTML(value) {

    if (!value) {
        return "";
    }

    return String(value)
        .replace(/<!\[CDATA\[/g, "")
        .replace(/\]\]>/g, "")
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim();

}


/* =========================================================
   PARSE RSS
   ========================================================= */

function parseRSS(xml, sourceName) {

    const parser =
        new XMLParser({
            ignoreAttributes: false,
            trimValues: true
        });

    const parsed =
        parser.parse(xml);

    const channel =
        parsed?.rss?.channel ||
        parsed?.feed;

    if (!channel) {
        return [];
    }

    let items =
        channel.item ||
        channel.entry ||
        [];

    if (!Array.isArray(items)) {
        items = [items];
    }

    return items
        .map(item => {

            let link = item.link;

            if (
                typeof link === "object" &&
                link !== null
            ) {
                link =
                    link["@_href"] ||
                    link.href ||
                    "";
            }

            return {

                title:
                    stripHTML(
                        item.title ||
                        "Cybersecurity News"
                    ),

                url:
                    link || "#",

                domain:
                    sourceName,

                sourcecountry:
                    "GLOBAL",

                seendate:
                    item.pubDate ||
                    item.published ||
                    item.updated ||
                    null

            };

        })
        .filter(article =>
            article.title &&
            article.url
        );

}


/* =========================================================
   CYBERSECURITY FILTER
   ========================================================= */

function isCybersecurityStory(article) {

    const text =
        `${article.title}`.toLowerCase();

    const keywords = [

        "cyber",
        "security",
        "hack",
        "hacker",
        "ransomware",
        "malware",
        "phishing",
        "exploit",
        "vulnerability",
        "breach",
        "attack",
        "zero-day",
        "zeroday",
        "trojan",
        "botnet",
        "spyware",
        "credential",
        "cve",
        "data leak",
        "infostealer"

    ];

    return keywords.some(
        keyword =>
            text.includes(keyword)
    );

}


/* =========================================================
   GET CYBER NEWS
   ========================================================= */

const getCyberNews = async (req, res) => {

    try {

        console.log(
            "[CyberTwin] Fetching cybersecurity RSS..."
        );


        let allArticles = [];


        for (const feed of RSS_FEEDS) {

            try {

                console.log(
                    `[CyberTwin] RSS source: ${feed.name}`
                );

                const xml =
                    await fetchRSS(feed.url);

                const articles =
                    parseRSS(
                        xml,
                        feed.name
                    );

                console.log(
                    `[CyberTwin] ${feed.name}: ${articles.length} articles`
                );

                allArticles.push(
                    ...articles
                );

            } catch (error) {

                console.error(
                    `[CyberTwin] ${feed.name} RSS error:`,
                    error.message
                );

            }

        }


        /*
         * Keep cybersecurity-related stories.
         */

        let cyberArticles =
            allArticles.filter(
                isCybersecurityStory
            );


        /*
         * If filtering leaves too few
         * articles, use the source's
         * latest stories instead.
         */

        if (cyberArticles.length < 6) {

            cyberArticles =
                allArticles;

        }


        /*
         * Remove duplicate URLs.
         */

        const unique =
            new Map();

        cyberArticles.forEach(
            article => {

                if (
                    !unique.has(
                        article.url
                    )
                ) {

                    unique.set(
                        article.url,
                        article
                    );

                }

            }
        );


        const news =
            Array.from(unique.values())
                .slice(0, 12);


        console.log(
            `[CyberTwin] Returning ${news.length} news articles`
        );


        return res.status(200).json({

            success: true,

            updatedAt:
                new Date().toISOString(),

            count:
                news.length,

            articles:
                news

        });


    } catch (error) {

        console.error(
            "[CyberTwin] Cyber news backend error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Failed to fetch cybersecurity news.",

            articles: []

        });

    }

};


module.exports = {
    getCyberNews
};