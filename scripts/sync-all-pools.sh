#!/bin/bash

# 同步所有链上的 Pool 到数据库
# 自动从 .env.deployed 读取代币地址，不再硬编码

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_DEPLOYED="$PROJECT_ROOT/contracts/.env.deployed"
ANALYTICS_ENV="$PROJECT_ROOT/backend/services/analytics-service/.env"

# 从 analytics-service .env 读取 RPC URL（支持 Sepolia / localhost）
if [ -f "$ANALYTICS_ENV" ]; then
  RPC_URL=$(grep '^BLOCKCHAIN_RPC_URL=' "$ANALYTICS_ENV" | cut -d'=' -f2-)
fi
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

echo "🔍 检查服务状态..."
echo "   RPC URL: $RPC_URL"

# 检查后端服务是否运行
if ! curl -s http://localhost:3002/health > /dev/null 2>&1; then
  echo "❌ Analytics Service 未运行！"
  echo "   请先启动: cd backend/services/analytics-service && pnpm run start:dev"
  exit 1
fi

echo "✅ Analytics Service 运行中"

# 检查区块链节点是否运行
if ! curl -s -X POST "$RPC_URL" -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null 2>&1; then
  echo "❌ 区块链节点不可达！($RPC_URL)"
  echo "   请检查 RPC URL 配置或启动本地节点"
  exit 1
fi

echo "✅ 区块链节点运行中"

# 从 .env.deployed 读取地址
if [ ! -f "$ENV_DEPLOYED" ]; then
  echo "❌ 找不到 $ENV_DEPLOYED"
  echo "   请先运行: cd contracts && npx hardhat run scripts/deploy.ts --network localhost"
  exit 1
fi

echo "✅ 读取部署地址: $ENV_DEPLOYED"

# 读取 FACTORY_ADDRESS
FACTORY_ADDRESS=$(grep '^FACTORY_ADDRESS=' "$ENV_DEPLOYED" | cut -d'=' -f2)
if [ -z "$FACTORY_ADDRESS" ]; then
  echo "❌ .env.deployed 中未找到 FACTORY_ADDRESS"
  exit 1
fi

echo "   Factory: $FACTORY_ADDRESS"
echo ""

# 通过 JSON-RPC 从 Factory 读取 allPairsLength
echo "🔗 从 Factory 合约读取所有交易对..."

# allPairsLength() selector: 0x574f2ba3
pairs_length_hex=$(curl -s -X POST "$RPC_URL" \
  -H "Content-Type: application/json" \
  --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_call\",\"params\":[{\"to\":\"$FACTORY_ADDRESS\",\"data\":\"0x574f2ba3\"},\"latest\"],\"id\":1}" \
  | grep -o '"result":"[^"]*"' | cut -d'"' -f4)

if [ -z "$pairs_length_hex" ] || [ "$pairs_length_hex" = "0x" ]; then
  echo "❌ 无法读取 Factory 交易对数量"
  exit 1
fi

pairs_length=$((pairs_length_hex))
echo "   找到 $pairs_length 个交易对"
echo ""

if [ "$pairs_length" -eq 0 ]; then
  echo "⚠️  链上暂无交易对，无需同步"
  exit 0
fi

echo "🚀 开始同步所有交易对到数据库..."
echo ""

success=0
failed=0

for ((i=0; i<pairs_length; i++)); do
  # allPairs(uint256) selector: 0x1e3dd18b
  # 将索引编码为 32 字节 hex
  index_hex=$(printf "%064x" $i)

  pair_result=$(curl -s -X POST "$RPC_URL" \
    -H "Content-Type: application/json" \
    --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_call\",\"params\":[{\"to\":\"$FACTORY_ADDRESS\",\"data\":\"0x1e3dd18b${index_hex}\"},\"latest\"],\"id\":1}" \
    | grep -o '"result":"[^"]*"' | cut -d'"' -f4)

  # 从返回的 32 字节中提取地址（去掉前导零）
  pair_address="0x${pair_result:26:40}"

  echo "📝 处理交易对 [$i]: $pair_address"

  # 读取 token0 地址: token0() selector = 0x0dfe1681
  token0_result=$(curl -s -X POST "$RPC_URL" \
    -H "Content-Type: application/json" \
    --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_call\",\"params\":[{\"to\":\"$pair_address\",\"data\":\"0x0dfe1681\"},\"latest\"],\"id\":1}" \
    | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
  token0="0x${token0_result:26:40}"

  # 读取 token1 地址: token1() selector = 0xd21220a7
  token1_result=$(curl -s -X POST "$RPC_URL" \
    -H "Content-Type: application/json" \
    --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_call\",\"params\":[{\"to\":\"$pair_address\",\"data\":\"0xd21220a7\"},\"latest\"],\"id\":1}" \
    | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
  token1="0x${token1_result:26:40}"

  echo "   Token0: $token0"
  echo "   Token1: $token1"

  # 调用后端 API 创建/同步 Pool
  response=$(curl -s -X POST http://localhost:3002/api/v1/pool \
    -H "Content-Type: application/json" \
    -d "{\"token0Address\":\"$token0\",\"token1Address\":\"$token1\"}")

  if [ $? -eq 0 ]; then
    pairAddress=$(echo $response | grep -o '"pairAddress":"[^"]*"' | cut -d'"' -f4)
    poolId=$(echo $response | grep -o '"id":[0-9]*' | cut -d':' -f2)

    if [ -n "$pairAddress" ]; then
      echo "✅ Pool 已同步: $pairAddress"

      # 刷新 Pool 数据
      if [ -n "$poolId" ]; then
        curl -s -X POST "http://localhost:3002/api/v1/pool/$poolId/refresh" > /dev/null
        echo "✅ Pool 数据已刷新"
      fi

      ((success++))
    else
      echo "❌ 创建失败: $response"
      ((failed++))
    fi
  else
    echo "❌ API 调用失败"
    ((failed++))
  fi

  echo ""
  sleep 0.5
done

echo "=========================================="
echo "📊 同步完成！"
echo "✅ 成功: $success"
echo "❌ 失败: $failed"
echo "=========================================="
echo ""

if [ $failed -gt 0 ]; then
  echo "⚠️  有失败的交易对，请检查："
  echo "   1. 后端服务是否正常运行"
  echo "   2. Hardhat 节点是否正常运行"
  echo "   3. 合约是否已正确部署"
  echo ""
  exit 1
fi

echo "🎉 所有交易对已同步到数据库！"
echo "现在可以在前端 Pool 页面看到它们了。"
echo ""
