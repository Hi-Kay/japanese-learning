// Word-by-word breakdowns for the example sentences in vocab.js, keyed by the
// example's Japanese text. Each part: "japanese (with furigana) | romaji | meaning | role",
// role letters as in sentences.js (T topic, S subject, O object, L place, M time,
// V ending, Q other). A trailing "," after the role adds a comma.

const PARTICLES = new Set(["は", "が", "を", "に", "で", "の", "も", "と", "へ"]);

const RAW = {
  "手伝ってくれてありがとうございます。": [
    "手伝[てつだ]って|tetsudatte|helping|Q", "くれて|kurete|(me)|Q", "ありがとうございます|arigatou gozaimasu|thank you|V",
  ],
  "すみません、駅はどこですか。": [
    "すみません|sumimasen|excuse me|Q,", "駅[えき]|eki|station|T", "は|wa|(topic)|T", "どこ|doko|where|V", "です|desu|is|V", "か|ka|?|V",
  ],
  "はじめまして、よろしくお願いします。": [
    "はじめまして|hajimemashite|nice to meet you|Q,", "よろしく|yoroshiku|kindly|V", "お願[ねが]いします|onegai shimasu|please|V",
  ],
  "りんごを十個ください。": [
    "りんご|ringo|apples|O", "を|o|(object)|O", "十[じゅっ]個[こ]|jukko|ten (things)|Q", "ください|kudasai|please give|V",
  ],
  "これは百円です。": [
    "これ|kore|this|T", "は|wa|(topic)|T", "百[ひゃく]円[えん]|hyaku en|100 yen|V", "です|desu|is|V",
  ],
  "今日は月曜日です。": [
    "今日[きょう]|kyou|today|T", "は|wa|(topic)|T", "月曜日[げつようび]|getsuyoubi|Monday|V", "です|desu|is|V",
  ],
  "すみません、これはいくらですか。": [
    "すみません|sumimasen|excuse me|Q,", "これ|kore|this|T", "は|wa|(topic)|T", "いくら|ikura|how much|V", "です|desu|is|V", "か|ka|?|V",
  ],
  "私の名前は田中です。": [
    "私[わたし]|watashi|I|T", "の|no|'s|T", "名前[なまえ]|namae|name|T", "は|wa|(topic)|T", "田中[たなか]|Tanaka|Tanaka|V", "です|desu|is|V",
  ],
  "毎朝パンを食べます。": [
    "毎朝[まいあさ]|maiasa|every morning|M", "パン|pan|bread|O", "を|o|(object)|O", "食[た]べます|tabemasu|eat|V",
  ],
  "明日、東京に行きます。": [
    "明日[あした]|ashita|tomorrow|M,", "東京[とうきょう]|toukyou|Tokyo|L", "に|ni|to|L", "行[い]きます|ikimasu|go|V",
  ],
  "新しい靴を買いました。": [
    "新[あたら]しい|atarashii|new|O", "靴[くつ]|kutsu|shoes|O", "を|o|(object)|O", "買[か]いました|kaimashita|bought|V",
  ],
  "日本語が少し分かります。": [
    "日本語[にほんご]|nihongo|Japanese|S", "が|ga|(subject)|S", "少[すこ]し|sukoshi|a little|Q", "分[わ]かります|wakarimasu|understand|V",
  ],
  "この犬はとても大きいです。": [
    "この|kono|this|T", "犬[いぬ]|inu|dog|T", "は|wa|(topic)|T", "とても|totemo|very|V", "大[おお]きい|ookii|big|V", "です|desu|is|V",
  ],
  "この映画は面白かったです。": [
    "この|kono|this|T", "映画[えいが]|eiga|movie|T", "は|wa|(topic)|T", "面白[おもしろ]かった|omoshirokatta|was interesting|V", "です|desu|(polite)|V",
  ],
  "注文をお願いします。": [
    "注文[ちゅうもん]|chuumon|order|O", "を|o|(object)|O", "お願[ねが]いします|onegai shimasu|please|V",
  ],
};

export const EXAMPLE_PARTS = Object.fromEntries(Object.entries(RAW).map(([jp, parts]) => [jp, parts.map((p) => {
  const [word, ro, en, roleSpec] = p.split("|");
  const comma = roleSpec.endsWith(",");
  return { id: ro, jp: word, ro, en, role: roleSpec.replace(",", ""), comma, particle: PARTICLES.has(word) };
})]));
