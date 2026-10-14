# Embedding技術と実行条件

## 使用するモデル

| 項目 | 値 |
| --- | --- |
| モデル | `Xenova/all-MiniLM-L6-v2` |
| 上流モデル | `sentence-transformers/all-MiniLM-L6-v2` |
| 実行ライブラリー | Transformers.js 3.5.2 |
| 出力 | 384次元 |
| Pooling | Mean pooling |
| 正規化 | L2 |
| 入力上限 | 256 word pieces |

[上流モデルカード](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)は、文と短い段落を384次元の密ベクトルへ写像し、検索、クラスタリング、意味類似度に使えるモデルとして説明しています。256 word piecesを超える入力は切り詰めると明記しています。

## word piecesの数え方

文字数や空白区切り語数ではなく、読み込んだモデルと同じBERTトークナイザーの`input_ids`長を使います。`[CLS]`と`[SEP]`などの特殊トークンも含みます。

ブラウザー向けモデル移植の設定は汎用BERT上限を持つため、本ツールは読み込み後の`model_max_length`を256へ明示的に固定します。トークン数の表示と埋め込み処理が同じ上限を使います。

## 実行フロー

1. jsDelivrから固定版のTransformers.jsを動的`import()`する
2. Hugging FaceからトークナイザーとONNXモデルを取得する
3. 候補の切り詰め前トークン数を数える
4. 256 word piecesへ切り詰めてmean poolingする
5. 384次元ベクトルをL2正規化する

参照文も同じモデル、pooling、正規化で処理します。

## キャッシュ

Transformers.jsはモデル関連ファイルをブラウザーキャッシュへ保存できます。参照文埋め込みと重心はページのセッション中にメモリーへ保持します。

キャッシュはブラウザー設定、容量制限、削除、プライベートモードなどに左右されます。「一度動けば次回は必ず完全オフライン」とは保証しません。`navigator.onLine`も、モデルキャッシュの有無を示しません。

## 通信とプライバシー

入力文字列はアプリケーションのAPIへ送信せず、ブラウザー内でトークン化・推論します。一方、実行ライブラリーとモデルを取得するネットワーク通信は発生し得ます。機密入力では、必要な取得が終わっていることと、Networkパネルに入力を含む送信がないことを利用者自身が確認する必要があります。

## 制限

- 英語向けのモデルである
- 256 word pieces以降は埋め込みに反映されない
- 文・短い段落向けで、長文全体の構造を評価しない
- ベクトルの近さは文法、事実性、復号正解を保証しない
- CDN動的importにはSRIを付けられない

## 参考

- [all-MiniLM-L6-v2 model card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
- [Transformers.js pipeline API](https://huggingface.co/docs/transformers.js/pipelines)
- [Transformers.js tokenizer API](https://huggingface.co/docs/transformers.js/api/tokenizers)
