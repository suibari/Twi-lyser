'use strict';

// redisインスタンス生成&接続
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

const MAX_TPS_LENGTH   = 10;    // この数までTPS値をためてから平均を出す

var obj_tps_tmp       = {};
var obj_time_prvtweet = {};

// redis初期化関数
module.exports.init = function () {
  redis.flushall().then(console.log("YUKI.N > successful to reflesh redis."));
}

// countのsetter
module.exports.setCount = function (word, teams) {
  teams.forEach((team) => { // teams配列を分解

    // count_xxx(team名)とwordの組み合わせがDBにあるか(zscore)
    const key = "count_"+team;
    redis.zscore(key, word, (err, res) => {
      if (res != "null") {
        // あるならインクリメント(zincrby)
        redis.zincrby(key, 1, word);
      } else {
        // ないなら追加(zadd, scoreは1)
        redis.zadd(key, 1, word);
      }
    });

    // all用のcountを作る
    const member = [word, team];
    redis.zscore("count_all", JSON.stringify(member), (err, res) => {
      if (res != "null") {
        // あるならインクリメント
        redis.zincrby("count_all", 1, JSON.stringify(member));
      } else {
        // ないなら追加
        redis.zadd("count_all", 1, JSON.stringify(member));
      }
    })
  })
};

//module.exports.getCount = function (team) {
//  var arr_count_team = [];
//
//  // redisから取得
//  redis.get("count", (err, result) => {
//    if ((team == "all") || (team == "")) {
//      // 指定チームがない場合
//      arr_count_team = result;
//    } else {
//      // 指定チームがある場合、arr_count[n].teamが引数teamと一致する配列を作る
//      arr_count_team = result.filter((obj) => { return obj.team == team; });
//    }
//    
//    // 出力がOUT_WORDS_LENGTH分たまっているかどうか
//    if (arr_count_team.length > OUT_WORDS_LENGTH) {
//      // 配列の後ろOUT_WORDS_LENGTH個を出力する
//      return arr_count_team.slice(arr_count_team.length - OUT_WORDS_LENGTH);
//    } else {
//      return arr_count_team;    
//    }
//  })
//}

// TPSのsetter
module.exports.setTPS = function (teams) {
  // 時間計測する。ツイート時間間隔の配列obj_tps_tmpを操作する
  teams.forEach((team) => { // teams配列を分解
    if (obj_tps_tmp[team]) {
      // 計測中のチームである
      var time_dst = (new Date().getTime() - obj_time_prvtweet[team].getTime()) / 1000;
      obj_tps_tmp[team].push(1 / time_dst);
      obj_time_prvtweet[team] = new Date(); // 現在時刻に更新
    } else {
      // 初めて計測するチームである
      obj_tps_tmp[team] = [];
      obj_time_prvtweet[team] = new Date();
    };
    // メモリひっ迫対策で、時間計測結果が一定値以上なら削除
    if (obj_tps_tmp[team].length > MAX_TPS_LENGTH) {
      obj_tps_tmp[team].shift();
    }
  })

  // obj_tps_tmpから平均を求めてTPS計算する
  var obj_tps = {};
  for (let team in obj_tps_tmp) {
    var res;
    const tps_tmp_length_team = obj_tps_tmp[team].length;

    if (tps_tmp_length_team > 0) {
      // たまっているTPSが1以上なら平均を出せる
      var sum = 0;
      for (var i = 0; i < obj_tps_tmp[team].length; i++) {
        sum += obj_tps_tmp[team][i];
      }
      res = sum / obj_tps_tmp[team].length;
    } else {
      // 2つ目のツイートが来るまでは割り算できない(0で割れない)
      res = 0; // 0を入れておく
    }

    // 小数点3位までに丸める
    //obj_tps[team] = res.toFixed(3);
    obj_tps[team] = res;
  }
  
  // redisに書き込み
  redis.set("tps", JSON.stringify(obj_tps));
}

//module.exports.getTPS = function () {
//  
//  return obj_tps;
//}