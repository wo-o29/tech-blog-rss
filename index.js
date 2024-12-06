import Parser from "rss-parser";
import nodemailer from "nodemailer";
import fs from "fs";
import dotenv from "dotenv";
import RSS_FEEDS from "./feeds.js";
dotenv.config();

const parser = new Parser({
  timeout: 30000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    Accept:
      "application/rss+xml, application/xml, application/atom+xml, text/xml, */*",
  },
});
const LAST_CHECK_FILE = "last_check.json";

// 이메일 전송을 위한 설정
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  auth: {
    user: "woogur29@gmail.com",
    pass: process.env.APP_PASSWORD,
  },
});

const sendMail = (feed, lastPost) => {
  const mailOptions = {
    from: "woogur29@gmail.com",
    to: "woogur29@gmail.com",
    subject: `${feed.name}의 새로운 글이 올라왔어요.`,
    text: `${lastPost.title}\n${lastPost.link}`,
  };

  transporter.sendMail(mailOptions, (error) => {
    if (error) {
      throw new Error(error);
    }

    console.log("메일이 정상적으로 전송되었습니다.");
    writeBlogData(fileData, feed.name, lastPost.title);
  });
};

const writeBlogData = (feedName, lastPostTitle) => {
  const fileData = getFileData();
  const copyFileData = { ...fileData };
  copyFileData[feedName] = lastPostTitle;
  fs.writeFileSync(LAST_CHECK_FILE, JSON.stringify(copyFileData));
};

const getFileData = () => {
  if (fs.existsSync(LAST_CHECK_FILE)) {
    const fileData = fs.readFileSync(LAST_CHECK_FILE).toString();
    return JSON.parse(fileData);
  }
};

const convertJSON = (data) => {
  const string = JSON.stringify(data);
  return JSON.parse(string);
};

const checkRSSFeeds = async () => {
  console.log("체크 시작");
  const fileData = getFileData();

  for (const feed of RSS_FEEDS) {
    try {
      const parsedFeed = await parser.parseURL(feed.url); // rss 내용
      const lastPost = convertJSON(parsedFeed.items[0]);

      if (!fileData[feed.name]) {
        // 처음 추가한 RSS 데이터인 경우
        writeBlogData(feed.name, lastPost.title);
        fileData[feed.name] = lastPost.title;
      }

      if (fileData[feed.name] !== lastPost.title) {
        sendMail(feed, lastPost);
      }
    } catch (error) {
      console.error(`Error checking RSS feed ${feed.name}:`, error);
    }
  }
};

checkRSSFeeds();
