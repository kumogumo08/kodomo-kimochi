/**
 * 感情データ（Emotion Coaching 用）
 * id はルートパラム・画像ファイル名と対応
 * 詳細画面用の empathy / actions / parentGuide は親向けの表現
 */
import i18n from '@/lib/i18n';
export type EmotionId =
  | 'happy'
  | 'angry'
  | 'sad'
  | 'anxious'
  | 'irritated'
  | 'lonely';

export type Emotion = {
  id: EmotionId;
  label: string;
  image: number;
  bgColor: string;
  /** 子供に大きく見せる共感の一言 */
  empathyMain: string;
  /** いまやること候補（子供向け・ランダム表示） */
  actions: string[];
  /** できた！押下後の祝福メッセージ */
  empathy: string[];
  /** 親向け：気持ちを落ち着かせる具体的な行動案リスト */
  parentActions: string[];
  parentGuide: string;
  /** 親向け・研究のヒント（任意。存在する場合のみ表示） */
  evidenceNote?: string;
};

export const EMOTIONS: Emotion[] = [
  {
    id: 'happy',
    label: 'うれしい',
    image: require('@/assets/emotions/emotion_happy.png'),
    bgColor: '#FFF9C4',
  
    empathyMain: 'たのしかったんだね♪',
  
    actions: [
      'にこっとしてみよう',
      '「うれしい！」っていってみよう',
      'うれしかったことをだれかに伝えてみよう',
    ],
  
    empathy: [
      'うれしかったんだね',
      'たのしかったんだね',
      'よかったね',
    ],
  
    parentActions: [
      'うれしかったことを一言で言ってみる',
      '誰かに「たのしかった」と伝えてみる',
      '親子でいっしょに喜ぶ',
    ],
  
    parentGuide:
      'うれしい気持ちは、無理に広げなくても大丈夫です。まずは「うれしかったね」と受け止め、何がよかったのかを一言で言えると、感情の言語化の練習になります。',
  
    evidenceNote:
      'うれしい出来事を言葉にしたり誰かと共有することは、ポジティブ感情や人とのつながりを高めることが報告されています。（Gable & Reis, 2010）\nまた、感情を言葉にすることは感情調整の発達に関係するとされています。（Lieberman et al., 2007）',
  },
  {
    id: 'angry',
    label: 'おこり',
    image: require('@/assets/emotions/emotion_angry.png'),
    bgColor: '#FFCDD2',
  
    empathyMain: 'いやだったんだね。',
  
    actions: [
      'ゆっくり3かい しんこきゅうしてみよう',
      'ぐーっと手をにぎって ぱっとひらこう',
      'そのばで10までかぞえてみよう',
      'すこしそのばをはなれてみよう',
      'かたをぐるぐるまわしてみよう',
    ],
  
    empathy: [
      'おこってるんだね',
      'いやだったんだね',
      'くやしかったんだね',
      'うまくいかなくて つらかったね',
      'やりたかったんだね',
      'とめられて いやだったね',
    ],
  
    parentActions: [
      'まず安全を確保し、けがをしそうな物や人から少し離す',
      '短い言葉で「いやだったね」と気持ちを受け止める',
      '落ち着くまでは理由を聞きすぎず、深呼吸や数かぞえを一緒に行う',
      '声の大きさを下げ、親が先にゆっくり話す',
      '落ち着いてから「何がいやだった？」と一つだけ聞く',
      '必要なら「悔しかった」「待てなかった」など、親が言葉を補う',
    ],
  
    parentGuide:
      '怒りの場面では、すぐに注意や説明を増やすと逆に興奮しやすくなります。まずは安全を確保し、「いやだったね」「くやしかったね」と短く受け止めてください。落ち着く前に正しさを教えるより、先に感情を下げることが大切です。少し落ち着いてから、何が嫌だったのか、次はどうするかを一緒に整理すると効果的です。',
  
    evidenceNote:
      '子どもの怒りに対して、まず感情を受け止めて落ち着かせる関わり（Emotion Coaching）は、子どもの感情調整力の発達を助ける可能性があると報告されています（Gottman et al., 1997）。\nまた、親が落ち着いた行動を示すことは、子どもの感情調整の学習につながるとされています（Morris et al., 2007）。',
  },
  {
    id: 'sad',
    label: 'かなしい',
    image: require('@/assets/emotions/emotion_sad.png'),
    bgColor: '#B3E5FC',
  
    // 子どもが最初に見る一言
    empathyMain: 'つらかったね。',
  
    actions: [
      '「かなしい」っていってみよう',
      'しんこきゅうをしてみよう',
      'ぎゅうっとしてもらおう',
      'だれかにきもちをつたえてみよう',
      'すこしやすんでみよう',
    ],
  
    // 親が使いやすい声かけ候補
    empathy: [
      'かなしかったんだね',
      'つらかったね',
      'ないちゃうよね',
      'さみしいきもちに なったんだね',
      'いやだったことが あったんだね',
      'こころが しんどかったね',
    ],
  
    // 親向け詳細：まず落ち着かせるための具体策
    parentActions: [
      'まずはそばにいて、泣くことを止めすぎない',
      '抱っこや背中をさするなど、安心できる関わりをする',
      '「かなしかったね」と短く気持ちを言葉にして返す',
      '落ち着くまでは説明や説得を急がず、静かな声で寄り添う',
      '少し落ち着いたら、「何がつらかった？」と一つだけ聞く',
      '言葉にしづらそうなら、「さみしかった？」「くやしかった？」と選べる形で助ける',
    ],
  
    // 親向け要点
    parentGuide:
      '悲しみの場面では、すぐに元気づけたり解決しようとするより、まず「つらかったね」と受け止めることが大切です。子どもは悲しいとき、自分だけで気持ちを整えるのが難しいことがあります。抱っこやそばにいること、静かな声かけは、安心感をつくる助けになります。少し落ち着いてから、何が悲しかったのかを一緒に言葉にできると、感情の整理につながります。',
  
    // 任意: 根拠メモを別表示に使うなら
    evidenceNote:
      '親の共同調整（co-regulation）や安心できる支えは、子どもの感情調整の発達を助けます\n（Paley & Hajal, 2022; Morris et al., 2017）。\n\nまた、親の存在や支えは子どものストレス反応を和らげる social buffering として働くことがあります。（Hostinar et al., 2014; Gunnar & Hostinar, 2015）。'
  },
  {
    id: 'anxious',
    label: 'ふあん',
    image: require('@/assets/emotions/emotion_anxious.png'),
    bgColor: '#E1BEE7',
  
    // 子どもが最初に見る一言
    empathyMain: 'こわいきもちがあるんだね。',
  
    actions: [
      'ゆっくりしんこきゅうしてみよう',
      '「だいじょうぶ」っていってみよう',
      'だれかに「ちょっとこわい」ってつたえてみよう',
      'ぎゅうっとしてもらおう',
      'からだをのばしてみよう',
    ],
  
    // 親が子どもに返しやすい言葉
    empathy: [
      'しんぱいなんだね',
      'こわいきもちがあるんだね',
      'どきどきしてるんだね',
      'どうなるか わからなくて ふあんなんだね',
      'いやなことが おこりそうで こわいんだね',
      'あんしんしたいきもちが あるんだね',
    ],
  
    // 親向け詳細：まず安心、その後で少し整理
    parentActions: [
      'まずは「こわいね」「しんぱいだね」と短く気持ちを受け止める',
      'ゆっくり息を吸って、長めに吐く呼吸を一緒に3回やってみる',
      '親がそばにいることを短く伝える',
      '落ち着くまでは質問を増やしすぎず、声を静かに保つ',
      '少し落ち着いたら「何がいちばん心配？」と一つだけ聞く',
      '安心のために毎回すべて避けるのではなく、小さくできる一歩があるか一緒に考える',
      '「だいじょうぶ？」を何度も繰り返すより、「いっしょにやってみよう」と支える',
    ],
  
    parentGuide:
      '不安の強いときは、まず安心感をつくることが大切です。最初に「こわいね」「しんぱいなんだね」と短く受け止め、呼吸やそばにいることで体の緊張を下げましょう。一方で、不安をなくすために毎回すべてを避けたり、何度も確認に答え続けたりすると、不安が続きやすくなることがあります。落ち着いてから、何が心配なのかを一緒に言葉にし、できそうな小さな一歩を考えると役立ちます。',
  
    evidenceNote:
      '子どもの不安では、親の関わり方が重要です。\n親主体の介入でも不安症状の改善が報告されており、安心を与えつつ関わることには意味があります。\n（Jewell et al., 2022; Shimshoni et al., 2024）\n\n一方で、子どもの不安を減らすために家族が回避や過度な安心づけを続ける family accommodation は、不安の維持と関連すると報告されています。（Thompson-Hollands et al., 2014; Kitt et al., 2022）\n呼吸やリラクセーションは、子どもの不安や緊張を下げる初期対応として使われています。\n（Toussaint et al., 2021）',
  },
  {
    id: 'irritated',
    label: 'イライラ',
    image: require('@/assets/emotions/emotion_irritated.png'),
    bgColor: '#FFE0B2',
  
    // 子どもに最初に見せる言葉
    empathyMain: 'がまんしてたんだね。',
  
    actions: [
      'ゆっくりしんこきゅうしてみよう',
      'そのばで10までかぞえてみよう',
      'からだをぐーっとのばしてみよう',
      'そのばをすこしはなれてみよう',
      'そのばでぴょんぴょんジャンプしてみよう',
    ],
  
    // 親が返しやすい言葉
    empathy: [
      'イライラするよね',
      'むっとしちゃったんだね',
      'がまんしてたんだね',
      'うまくいかなくて もやもやしたね',
      'やりたいことが できなくて いやだったね',
      'ちょっとつかれてたのかもしれないね',
    ],
  
    // 親向け対応
    parentActions: [
      'まず「イライラしたね」と短く言葉にして気持ちを受け止める',
      '深呼吸や数かぞえを一緒にして体の緊張を下げる',
      '少し手を止めて、体を動かしたり水を飲んだりしてリセットする',
      '「何がいちばんイヤだった？」と一つだけ聞く',
      '言葉にしづらい場合は「待てなかった？」「思い通りにならなかった？」と選べる形で助ける',
      '怒りになる前に「イライラしてる」と言えるよう練習する',
    ],
  
    parentGuide:
      'イライラは怒りほど強くない感情ですが、放置すると怒りに変わることがあります。まず「イライラしたね」「うまくいかなかったね」と言葉にして受け止めることで、子どもは自分の気持ちを理解しやすくなります。落ち着いたあとに何がイヤだったのかを一緒に整理すると、感情を言葉で伝える力が育ちます。',
  
    evidenceNote:
      '子どもの感情を言葉にする関わり\n（emotion labeling）は、感情調整の発達を助ける可能性があります。（Lieberman et al., 2007）\n\nまた、家庭環境での感情コーチングは子どもの自己調整能力や社会的適応と関連することが報告されています。（Morris et al., 2007; Eisenberg et al., 1998）',
  },
  {
    id: 'lonely',
    label: 'さみしい',
    image: require('@/assets/emotions/emotion_lonely.png'),
    bgColor: '#B2EBF2',
  
    // 子どもが最初に見る一言
    empathyMain: 'ひとりみたいにかんじたんだね。',
  
    actions: [
      'だれかに「いっしょにいよう」っていってみよう',
      '「さみしい」っていってみよう',
      'ぎゅうっとしてもらおう',
      'しんこきゅうしてみよう',
    ],
  
    // 親が返しやすい言葉
    empathy: [
      'さみしいんだね',
      'ひとりみたいに かんじたんだね',
      'だれかに いてほしいね',
      'こころが ぽつんと しちゃったんだね',
      'いっしょに いたかったんだね',
      'つながりたい きもちが あったんだね',
    ],
  
    // 親向け詳細：まず孤立感を下げる
    parentActions: [
      'まずは近くに行って、「さみしかったね」と短く受け止める',
      '手をつなぐ、抱っこする、隣に座るなど、安心できる関わりをする',
      '好きなぬいぐるみや安心できる物を持たせる',
      '無理に元気づけず、少し一緒にいる時間をつくる',
      '落ち着いてから、「だれといたかった？」「何がさみしかった？」と一つだけ聞く',
      '毎回すぐに気をそらすより、さみしい気持ちに名前をつける手助けをする',
    ],
  
    parentGuide:
      'さみしさは甘えではなく、「つながりたい」という大切なサインです。まずは近くにいて、「さみしかったね」と短く受け止めてください。手をつなぐ、抱っこする、隣に座るといった関わりは、子どもが安心を取り戻す助けになります。少し落ち着いてから、何がさみしかったのかを一緒に言葉にできると、気持ちの整理につながります。',
  
    evidenceNote:
      '子どもの孤独感は、心理的な不調や行動面の困難と関連することが報告されています。\n（Kwan et al., 2020）\n\nまた、親や友人と話しやすいこと、親の支えやつながりは、孤独感の低さと関連しています。\n（Madsen et al., 2025; Liu et al., 2025）\n\n感情コーチングのように子どもの気持ちを受け止める関わりは、内在化症状への保護要因になりうると報告されています。（Lobo et al., 2021）',
  },
];

const EMOTIONS_EN: Emotion[] = [
  {
    id: 'happy',
    label: 'Happy',
    image: require('@/assets/emotions/emotion_happy.png'),
    bgColor: '#FFF9C4',
    empathyMain: 'You had fun.',
    actions: ['Try a small smile.', 'Say “I’m happy!”', 'Tell someone what made you happy.'],
    empathy: ['You were happy.', 'You had fun.', 'That’s great.'],
    parentActions: [
      'Try saying what made you happy in one sentence.',
      'Tell someone, “That was fun.”',
      'Celebrate together as a parent and child.',
    ],
    parentGuide:
      'It’s okay if you don’t have to “make” the happy feeling bigger. First, acknowledge it: “You were happy.” If you can say what felt good in one sentence, it becomes practice for turning feelings into words.',
    evidenceNote:
      'When children put pleasant events into words and share them with others, positive emotions and connection with people can increase (Gable & Reis, 2010).\n\nAlso, putting feelings into words is linked to the development of emotion regulation (Lieberman et al., 2007).',
  },
  {
    id: 'angry',
    label: 'Angry',
    image: require('@/assets/emotions/emotion_angry.png'),
    bgColor: '#FFCDD2',
    empathyMain: 'That really didn’t feel good.',
    actions: [
      'Try slow breathing three times.',
      'Clench your hands tightly, then open them quickly.',
      'Count to 10 right there.',
      'Step away from the moment a little.',
    ],
    empathy: [
      'You’re feeling angry.',
      'That didn’t feel good.',
      'That was frustrating.',
      'It was hard because things didn’t go the way you wanted.',
      'You really wanted to do it.',
      'You were mad because you got stopped.',
    ],
    parentActions: [
      'First, make sure everyone is safe, and move a little away from things or people that could cause harm.',
      'Acknowledge their feeling with short words: “That didn’t feel good.”',
      'While they’re calming down, don’t ask too many questions. Breathe slowly and count together.',
      'Lower your voice, and speak slowly first.',
      'When they’re calmer, ask only one question: “What didn’t feel good?”',
      'If needed, help with words like “frustrating” or “couldn’t wait.”',
    ],
    parentGuide:
      'In the middle of an anger moment, adding more explanations or demands can actually make it easier to get even more activated. First, make sure everyone is safe. Then reflect it briefly: “That didn’t feel good” and “You felt frustrated.” Before they calm down, it’s more important to help lower the intensity than to teach “what’s right.” After a little calm, sorting out what was upsetting and what to do next together is effective.',
    evidenceNote:
      'When supporting children’s anger, emotion coaching—helping them receive their feelings and calm down—may support the development of emotion regulation (Gottman et al., 1997).\n\nAlso, parents showing calm behavior can help children learn emotion regulation (Morris et al., 2007).',
  },
  {
    id: 'sad',
    label: 'Sad',
    image: require('@/assets/emotions/emotion_sad.png'),
    bgColor: '#B3E5FC',
    empathyMain: 'That must have been painful.',
    actions: [
      'Try saying “I’m sad.”',
      'Try taking a deep breath.',
      'Ask for a big hug.',
      'Share your feelings with someone.',
      'Take a little rest.',
    ],
    empathy: [
      'So you were sad.',
      'That was tough.',
      "It’s okay to cry.",
      'So you were feeling lonely.',
      'You had something that didn’t feel okay.',
      'Your heart felt heavy.',
    ],
    parentActions: [
      'First, stay close and don’t stop the crying too much.',
      'Hold them or gently rub their back—do things that feel safe.',
      'Give back the feeling in short words: “You were sad.”',
      'Until they calm down, don’t rush explanations or persuasion. Stay with them in a quiet voice.',
      'When things are a bit calmer, ask only one thing: “What was hard?”',
      'If it’s hard to find words, offer choices like “Did you feel lonely?” or “Did you feel frustrated?”',
    ],
    parentGuide:
      'In sad moments, it’s important to first receive their feelings: “That was hard.” Children may find it difficult to manage their feelings by themselves when they’re sad. Being held close, staying nearby, and speaking gently can help create a sense of safety. After they calm a little, being able to say together what was sad can support emotional processing.',
    evidenceNote:
      'Support and co-regulation from parents can help children’s emotion regulation development.\n(Paley & Hajal, 2022; Morris et al., 2017).\n\nIn addition, having a caring presence can work as social buffering to reduce children’s stress responses (Hostinar et al., 2014; Gunnar & Hostinar, 2015).',
  },
  {
    id: 'anxious',
    label: 'Anxious',
    image: require('@/assets/emotions/emotion_anxious.png'),
    bgColor: '#E1BEE7',
    empathyMain: 'You have a scary feeling.',
    actions: [
      'Try slow breathing.',
      'Say “It’s okay.”',
      'Tell someone, “I’m a little scared.”',
      'Ask for a tight hug.',
      'Stretch your body a little.',
    ],
    empathy: [
      'You’re worried.',
      'You have a scary feeling.',
      'Your heart is racing.',
      "You feel anxious because you don’t know what will happen.",
      'You’re scared because something unpleasant might happen.',
      'You want reassurance.',
    ],
    parentActions: [
      'First, reflect: “You feel scared. You’re worried.”',
      'Breathe in slowly and breathe out longer together—try it three times.',
      'Briefly tell them you’re there.',
      'Until they calm down, don’t add too many questions. Keep your voice quiet.',
      'When they settle a bit, ask only one question: “What are you most worried about?”',
      'Instead of trying to remove every possibility, think together about a small step they can take.',
    ],
    parentGuide:
      'When anxiety is strong, creating a sense of safety is the first step. Start by reflecting: “You feel scared. You’re worried.” Help lower body tension through breathing and being nearby. On the other hand, constantly avoiding everything to reduce anxiety or endlessly reassuring them can sometimes make anxiety last longer. After calming, it helps to talk together about what they’re worried about and think of small steps they can take.',
    evidenceNote:
      'In children’s anxiety, how parents respond matters.\nParent-led approaches have been reported to improve anxiety symptoms while still providing safety and connection.\n(Jewell et al., 2022; Shimshoni et al., 2024)\n\nHowever, family accommodation—continually avoiding or giving extra reassurance—has been reported to be related to the maintenance of anxiety.\n(Thompson-Hollands et al., 2014; Kitt et al., 2022)\n\nBreathing and relaxation are used as early responses to lower children’s anxiety and tension (Toussaint et al., 2021).',
  },
  {
    id: 'irritated',
    label: 'Irritated',
    image: require('@/assets/emotions/emotion_irritated.png'),
    bgColor: '#FFE0B2',
    empathyMain: 'You were holding it in.',
    actions: [
      'Try slow breathing.',
      'Count to 10 in that moment.',
      'Stretch your body out.',
      'Take a small step away.',
      'Jump a little right there.',
    ],
    empathy: [
      'You get irritated, don’t you?',
      'You got grumpy.',
      'You were holding it in.',
      'Things didn’t go well, and you felt “blah-blah.”',
      'You couldn’t do what you wanted, and that was upsetting.',
      'Maybe you were a bit tired.',
    ],
    parentActions: [
      'Reflect their feeling briefly: “You were feeling irritated.”',
      'Do slow breathing or counting together to lower physical tension.',
      'Pause for a moment—move your body or drink some water to reset.',
      'Ask only one question: “What was the most annoying/irritating?”',
      'If it’s hard to put it into words, offer choices like “Were you waiting/trying?” or “Was it not what you wanted?”',
      'Practice saying “I’m feeling irritated” before it turns into anger.',
    ],
    parentGuide:
      'Irritation is not as intense as anger, but if it’s left alone it can turn into anger. When children can label what they feel—like “I’m irritated” or “It didn’t work”—they can make it easier to understand their own feelings. After calming down, sorting out what was annoying helps build the ability to communicate with words.',
    evidenceNote:
      'Supporting children to label their emotions can help their emotion regulation development.\n(Lieberman et al., 2007)\n\nAlso, emotion coaching in family settings has been reported to be related to children’s self-regulation and social adjustment.\n(Morris et al., 2007; Eisenberg et al., 1998)',
  },
  {
    id: 'lonely',
    label: 'Lonely',
    image: require('@/assets/emotions/emotion_lonely.png'),
    bgColor: '#B2EBF2',
    empathyMain: 'You felt like you were alone.',
    actions: [
      'Try telling someone, “Let’s be together.”',
      'Try saying “I’m lonely.”',
      'Ask for a hug.',
      'Try slow breathing.',
    ],
    empathy: [
      'You feel lonely.',
      'It feels like you’re alone.',
      'You want someone to be there.',
      'Your heart feels a bit empty.',
      'You really wanted to be together.',
      'You have a wish to connect.',
    ],
    parentActions: [
      'First, get close and acknowledge it briefly: “You were lonely.”',
      'Hold hands, hug them, or sit nearby—do things that feel safe.',
      'Give a favorite stuffed animal or something comforting.',
      'Don’t force them to “cheer up.” Instead, create time to be together.',
      'After they calm down, ask only one question: “Who did you want to be with?” “What was lonely for you?”',
      'Instead of immediately distracting them every time, help them put a name to the lonely feeling.',
    ],
    parentGuide:
      'Loneliness is not “spoiling” or “being needy.” It can be an important sign that you want connection. First, get close and reflect briefly: “You felt lonely.” Being close—holding hands, hugging, and sitting next to them—helps children feel safe again. After they settle a bit, putting into words what was lonely can support emotional processing.',
    evidenceNote:
      'Children’s loneliness is associated with mental health difficulties and challenges in behavior.\n(Kwan et al., 2020)\n\nAlso, being able to talk comfortably with parents or friends, and having support and connection from caregivers, is associated with lower levels of loneliness.\n(Madsen et al., 2025; Liu et al., 2025)\n\nEmotion-coaching-like support—receiving a child’s feelings—has been reported to be a protective factor against internalizing symptoms. (Lobo et al., 2021)',
  },
];

export function getEmotions(): Emotion[] {
  const lang = i18n.language?.startsWith('en') ? 'en' : 'ja';
  return lang === 'en' ? EMOTIONS_EN : EMOTIONS;
}

export function getEmotionById(id: string): Emotion | undefined {
  return getEmotions().find((e) => e.id === id);
}
