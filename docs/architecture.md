# 子供のきもち - Architecture

このファイルは「子供のきもち」アプリの技術構成、主要データ構造、画面責務、実装ルールを整理したものです。  
AI や開発者が、コード変更時に設計意図を崩さず理解できるようにするための文書です。

---

## 1. 技術スタック

### フレームワーク
- React Native
- Expo
- Expo Router

### 主要ライブラリ
- `expo-image`
- `react-native-safe-area-context`
- `@react-navigation/native`
- `@react-native-community/datetimepicker`
- `react-native-gesture-handler`

### React の基本方針
- 関数コンポーネントを使う
- Hooks ベースで実装する
- 画面状態は `useState`, `useMemo`, `useCallback`, `useEffect`, `useFocusEffect` を中心に管理する
- 重い UI は必要時のみ読み込む

---

## 2. ディレクトリ責務

このプロジェクトでは、責務ごとにコードを分ける。

### `app/`
ルーティング対象の画面を置く。  
Expo Router の画面単位のファイルを管理する。

例:
- 感情詳細画面
- 履歴画面
- about 画面

### `components/`
再利用可能な UI コンポーネントを置く。

例:
- `PremiumGate`
- `ResearchNote`
- `EmotionReportCharts`

### `constants/`
静的マスターデータを置く。

例:
- `EMOTIONS`
- `getEmotionById`

### `lib/`
UI ではないロジック、データ加工、日付処理、履歴管理を置く。

例:
- `date-utils`
- `emotion-history`
- `report-data`
- `debug-data`

---

## 3. アーキテクチャ方針

このアプリは以下の分離を重視する。

### 画面
- 表示と画面状態を管理する
- 画面固有の UI を構成する
- 必要なロジック関数を `lib` から呼ぶ

### コンポーネント
- 再利用可能な UI のまとまり
- 画面から props を受けて表示する
- ビジネスロジックを持ちすぎない

### 定数
- 感情マスターデータなどの静的情報
- 画面ごとに重複させない

### ロジック層
- 日付処理
- 履歴保存／取得／削除
- レポート生成
- 開発用データ生成

---

## 4. 主要画面と責務

### 4.1 感情選択画面
役割:
- ユーザーが今の感情を選ぶ入口
- 感情 ID をもとに感情詳細画面へ遷移する

責務:
- 感情一覧を見せる
- 選択された感情の `id` をルートに渡す

---

### 4.2 感情詳細画面
役割:
- アプリのコア画面
- 子ども向け対応と親向け補助情報を同時に扱う

責務:
- ルートパラメータから感情 ID を取得する
- `getEmotionById(id)` で感情データを取得する
- 子ども向けメイン表示を描画する
- `actions` から「いまやること」を1件だけ出す
- 「できた！」押下時に成功演出を表示する
- 親向けアコーディオンを表示する
- 必要なら `ResearchNote` を出す

重要:
- 子ども向け UI が最優先
- 親向け情報は補助
- 子どもに選択肢を増やしすぎない

---

### 4.3 履歴画面
役割:
- 記録された感情履歴の閲覧
- 親向けの振り返り
- プレミアム機能の中心画面

責務:
- 履歴データの取得
- プルリフレッシュ
- 日付ごとのセクション分け
- 古い履歴の圧縮表示
- 履歴削除
- 感情レポート表示
- `/about` への導線表示

重要:
- 単なるログ画面ではない
- 振り返り価値とプレミアム価値を担う

---

### 4.4 about 画面
役割:
- 親向けにアプリの考え方と使い方を説明する

責務:
- アプリ概要
- 基本的な使い方
- 活用のヒント

---

## 5. 主要コンポーネント

### `PremiumGate`
役割:
- プレミアム対象機能をラップする
- 未加入時はロック表示
- 加入時のみ子要素を表示

用途:
- 感情レポート
- 期間指定レポート
- グラフ表示

設計意図:
- プレミアム境界を UI 上で明確にする
- 各画面にバラバラに条件分岐を書きすぎない

---

### `ResearchNote`
役割:
- `evidenceNote` を親向けに表示する
- 根拠、研究メモ、補足説明をまとめる

表示条件:
- `emotion.evidenceNote` が存在する場合のみ

---

### `EmotionReportCharts`
役割:
- 感情レポートをグラフで可視化する

実装方針:
- lazy import する
- `Suspense` と組み合わせる
- 必要時のみ読み込む

理由:
- アプリ起動時や通常画面の負荷を抑えるため

---

## 6. 主要データ構造

### 6.1 Emotion
感情マスターデータ。

```ts
type Emotion = {
  id: string
  label: string
  image: ImageSource
  bgColor: string
  empathyMain: string
  empathy: string[]
  actions?: string[]
  parentActions: string[]
  parentGuide: string
  evidenceNote?: string
}
```

意味

id: 感情識別 ID

label: 感情名

image: 感情イラスト

bgColor: 感情ごとの背景色

empathyMain: 子ども向けの主共感メッセージ

empathy: 親が使う声かけ例

actions: 子どもが今やる行動候補

parentActions: 気持ちを落ち着かせる方法

parentGuide: 親向け対応ポイント

evidenceNote: 補足研究メモ

設計意図:

1つの感情データから、子ども向け UI と親向け補助情報の両方を構成できるようにする

6.2 EmotionHistoryItem

履歴データ。

type EmotionHistoryItem = {
  id: string
  emotionId: string
  label: string
  selectedAt: string
}

意味:

id: 履歴 ID

emotionId: 選択された感情 ID

label: 表示用感情名

selectedAt: 記録日時の ISO 文字列

設計意図:

履歴表示に必要な最小情報を持つ

表示時に emotionId から感情マスターを引けるようにする

6.3 履歴画面内部用データ
6.3 SummaryRow

折りたたみ時に1日分を1行にまとめる行。

type SummaryRow = {
  type: 'summary'
  dateKey: string
  count: number
}
6.4 EmotionCountRow

「過去」セクションで使う感情別件数行。

type EmotionCountRow = {
  type: 'emotionCount'
  emotionId: string
  label: string
  count: number
}
6.5 HistorySection

SectionList 用のセクション構造。

type HistorySection = {
  dateKey: string
  title: string
  data: HistorySectionItem[]
  isToday: boolean
  isPastSection?: boolean
}
7. 日付処理ルール

このプロジェクトでは日付処理をローカル日付基準で扱う。

重要方針

日付の比較はローカル日付キーで行う

ISO 文字列の単純比較だけに依存しない

日付選択 UI の期間指定もローカル日付基準で扱う

使用関数例

getTodayKey()

getLocalDateKey(iso)

getLocalDateKeyFromDate(date)

formatDateLabel(dateKey)

getCutoffKeyForPast()

理由

タイムゾーン差や toISOString() による日付ずれを防ぐため

「今日」「昨日」「期間指定」の期待と実際の表示を一致させるため

8. 履歴データ管理

履歴データ管理ロジックは lib/emotion-history に集約する。

主な責務

履歴の取得

履歴の削除

必要なら追加保存

利用関数例

getEmotionHistory()

removeEmotionFromHistory(id)

設計意図

画面側に保存実装を直接書きすぎない

データ保存方式を後で変えても影響を局所化する

9. レポート生成ロジック

レポートデータの生成は lib/report-data に集約する。

主な責務

期間別レポート生成

任意期間レポート生成

感情件数の集計

グラフ表示用データの整形

利用関数例

buildReportData(items, selectedPeriod, EMOTIONS)

buildReportDataForRange(items, rangeStart, rangeEnd, EMOTIONS)

設計意図

画面側では「表示」に集中する

集計仕様変更をロジック層に閉じ込める

10. 履歴画面の表示構造

履歴画面は SectionList を使って表示する。

表示ルール

今日の履歴は常に展開

直近の過去日は折りたたみ可能

1か月以上前は「過去」セクションにまとめる

「過去」では感情別件数のみ表示する

理由

新しい履歴は詳細に見返しやすくする

古い履歴は一覧性を優先する

画面の縦長化を抑える

11. ローディングと再読み込み
履歴画面

初回表示時に履歴をロードする

フォーカス復帰時に再読み込みする

プルリフレッシュに対応する

使用方針

画面復帰時に内容が古くならないようにする

ローディング中は ActivityIndicator を使う

12. 遅延読み込み方針
対象

EmotionReportCharts

実装方針

lazy() で読み込む

Suspense でフォールバックを出す

レポートが必要な時だけ読み込む

目的

起動速度と通常画面の軽さを守る

重いグラフ系依存の影響を局所化する

13. 開発用機能
debug-data

役割:

開発・検証用に履歴データを生成する

表示条件

__DEV__ のときのみ使う

設計意図

レポートや履歴 UI の確認を高速化する

本番機能とは分離する

14. ナビゲーション設計

Expo Router を使う。

主な遷移

感情選択画面 → /emotion/[id]

履歴画面 → /emotion/[id]

履歴画面 → /about

ルーティング方針

画面 ID は感情 ID を使う

ルートパラメータで感情識別を渡す

画面間で余計な状態依存を増やさない

15. UI 実装ルール
子ども向け UI

最優先でシンプルにする

選択肢を増やしすぎない

抽象説明より具体行動を優先する

達成時の成功演出を大事にする

親向け UI

情報を出しすぎない

必要なときだけ見られる構造にする

折りたたみや別画面導線を使う

履歴・レポート UI

一覧性を重視する

空状態とローディング状態を明確に出す

古いデータは圧縮表示する

16. パフォーマンス設計ルール

重いグラフは遅延読み込みする

子ども向け主要画面を重くしない

レポート処理を必要時以外に走らせすぎない

大量履歴をそのまま全展開しない

古い履歴は集約表示する

17. AI が変更時に守るべきこと
絶対に崩さないこと

子ども向け UI を最優先にする

「いまやること」は1つだけ提示する

成功演出を軽視しない

親向け情報を最初から出しすぎない

日付処理をローカル日付基準で扱う

レポート機能の重さで全体体験を悪化させない

実装時の基本姿勢

画面は表示責務に集中させる

集計や日付処理は lib に寄せる

再利用できる UI は components に分ける

感情の静的情報は constants で一元管理する

18. このアーキテクチャの一文要約

「子供のきもち」は、
子ども向けの即時感情対応 UI を中心に置き、親向けの補助情報・履歴・レポート機能を別レイヤーで支える、軽量で役割分離された React Native / Expo アプリ である。

AI向け要約:

このアプリは「子ども向け感情対応UI」を中心に設計されている。
分析・履歴・レポートは親向け補助機能であり、
子ども向け画面のシンプルさと即時行動提示を壊してはいけない。