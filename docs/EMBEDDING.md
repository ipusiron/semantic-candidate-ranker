# Embedding技術詳解

本ドキュメントでは、Semantic Candidate Rankerで使用されるEmbedding（埋め込み）技術について詳しく解説します。

## 1. Embeddingとは

### 基本概念

Embeddingは、テキストを固定長の数値ベクトルに変換する技術です。

```
"hello world" → [0.12, -0.34, 0.56, ..., 0.78]  (384次元)
```

### 特徴

- **意味の保存**: 意味的に類似したテキストは、ベクトル空間上で近い位置に配置される
- **固定長出力**: 入力テキストの長さに関係なく、同じ次元数のベクトルを出力
- **数値演算可能**: ベクトル同士の演算（加算、類似度計算など）が可能

## 2. 使用モデル

### all-MiniLM-L6-v2

本ツールでは、Sentence Transformersの`all-MiniLM-L6-v2`モデルを使用しています。

| 項目 | 値 |
|------|-----|
| モデル名 | all-MiniLM-L6-v2 |
| 出力次元 | 384 |
| モデルサイズ | 約23MB |
| ベースモデル | MiniLM |
| 学習データ | 10億以上の文ペア |
| 最適化対象 | 文の意味的類似度 |

### 選定理由

1. **軽量**: ブラウザーで動作可能なサイズ
2. **高速**: 推論時間が短い
3. **高精度**: 文レベルの類似度タスクで優れた性能
4. **多言語対応**: 英語に最適化されているが、基本的な多言語能力あり

## 3. Transformers.js

### 概要

[Transformers.js](https://github.com/xenova/transformers.js)は、Hugging Faceのモデルをブラウザー上で実行するためのJavaScriptライブラリーです。

### 特徴

- **WebAssembly**: ONNX Runtimeを使用したWASM実行
- **ゼロ依存**: サーバー不要でブラウザーのみで動作
- **モデルキャッシュ**: IndexedDBにモデルを保存
- **プログレス表示**: ダウンロード進捗のコールバック対応

### 使用方法

```javascript
import { pipeline } from '@huggingface/transformers';

// パイプライン作成
const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

// Embedding取得
const output = await extractor('Hello world', {
  pooling: 'mean',
  normalize: true
});
```

## 4. Pooling戦略

トークンレベルの出力を文レベルのベクトルに集約する方法です。

### Mean Pooling（本ツールで使用）

全トークンの出力ベクトルの平均を取る方法。

```
sentence_embedding = mean(token_embeddings)
```

**メリット**:
- 文全体の意味を均等に反映
- 長い文でも安定した出力

### 他のPooling方法

| 方法 | 説明 | 特徴 |
|------|------|------|
| CLS Pooling | [CLS]トークンの出力を使用 | 分類タスク向け |
| Max Pooling | 各次元の最大値を取る | 重要な特徴を強調 |
| Mean Pooling | 全トークンの平均 | 汎用的 |

## 5. コサイン類似度

### 定義

2つのベクトル間の角度のコサインを計算し、類似度を測定します。

```
cosine_similarity(A, B) = (A · B) / (||A|| × ||B||)
```

### 値の解釈

| 値 | 解釈 |
|----|------|
| 1.0 | 完全に同じ方向（最も類似） |
| 0.0 | 直交（無関係） |
| -1.0 | 正反対の方向（最も異なる） |

### L2正規化済みベクトルの場合

ベクトルが正規化されている場合、コサイン類似度は内積に等しくなります。

```
// 正規化済みの場合
cosine_similarity(A, B) = A · B
```

## 6. 処理フロー

```
┌─────────────────┐
│   入力テキスト   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   トークン化     │  テキストをトークンIDに変換
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Transformer    │  各トークンを768次元ベクトルに
│    Encoder      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Mean Pooling   │  全トークンの平均を計算
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   L2正規化      │  単位ベクトルに変換
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 384次元ベクトル  │
└─────────────────┘
```

## 7. キャッシング戦略

### モデルキャッシュ

- 初回ダウンロード後、IndexedDBに保存
- 2回目以降はローカルから読み込み
- キャッシュサイズ: 約23MB

### 参照文Embeddingキャッシュ

- 初回計算後、メモリーにキャッシュ
- 言語切り替え時にクリア（本ツールでは常に英語のため不要）
- セッション中は再計算不要

## 8. パフォーマンス最適化

### バッチ処理

複数のテキストを一度に処理することで、オーバーヘッドを削減。

```javascript
const BATCH_SIZE = 10;

for (let i = 0; i < texts.length; i += BATCH_SIZE) {
  const batch = texts.slice(i, i + BATCH_SIZE);
  // バッチ処理
}
```

### UIスレッドへのYield

長時間の処理中もUIがフリーズしないよう、定期的にYield。

```javascript
await new Promise(resolve => setTimeout(resolve, 0));
```

## 9. 制限事項

### トークン長制限

- 最大512トークン（モデル依存）
- それ以上は切り捨て

### 言語

- 英語に最適化
- 日本語など他言語では精度低下

### 文脈

- 文単位の処理（文書全体の文脈は考慮しない）
- 非常に短いテキストでは精度低下

## 10. 参考資料

- [Sentence-Transformers](https://www.sbert.net/)
- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js)
- [all-MiniLM-L6-v2 Model Card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
- [ONNX Runtime Web](https://onnxruntime.ai/docs/get-started/with-javascript.html)
