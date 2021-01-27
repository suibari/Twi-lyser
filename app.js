'use strict';

const twit    = require('twit')({
  consumer_key:        process.env.CONSUMER_KEY,
  consumer_secret:     process.env.CONSUMER_SECRET,
  access_token:        process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

// twitterストリーミングエンドポイントとの接続
const stream = twit.stream('statuses/filter',
  {
    track: convertAry( require('./src/query.json') ), 
    language: "ja"
  }
);

// DB初期化: Twitter投稿時に初期化する方針としたためここはコメントアウト
//require('./storing.js').init();

// ツイートがあるたびにanalysis.jsを呼び出す
stream.on('tweet', (tweet) => {
  console.log(tweet.user.name + "> " + tweet.text);
  // analysis.jsにtweet.textを渡す
  require('./analysis.js')(tweet.text);
});

// JSONから配列にパースする関数
function convertAry(json) {
  var q = [];
  for (let key in json) {
    for (let i = 0; i < json[key].length; i++) {
      q.push(json[key][i]);
    }
  }
  return q;
};