import { useEffect, useRef } from 'react';
import { Box } from '@chakra-ui/react';
import { createChart } from 'lightweight-charts';

function PriceChart({ trades }) {
  const chartContainerRef = useRef();
  const chartRef = useRef();

  useEffect(() => {
    // Create the chart
    if (!chartRef.current) {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { color: '#ffffff' },
          textColor: '#333',
        },
        grid: {
          vertLines: { color: '#f0f0f0' },
          horzLines: { color: '#f0f0f0' },
        },
        width: chartContainerRef.current.clientWidth,
        height: 400,
      });

      // Create the price series
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });

      // Add a volume series
      const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });

      chartRef.current = {
        chart,
        candlestickSeries,
        volumeSeries,
      };

      // Handle window resize
      const handleResize = () => {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    }
  }, []);

  useEffect(() => {
    if (!trades || !chartRef.current) return;

    // Process trades into OHLCV data
    const ohlcvMap = new Map();
    const interval = 5 * 60 * 1000; // 5-minute intervals

    trades.forEach(trade => {
      const timestamp = Math.floor(new Date(trade.timestamp).getTime() / interval) * interval;
      
      if (!ohlcvMap.has(timestamp)) {
        ohlcvMap.set(timestamp, {
          time: timestamp / 1000,
          open: trade.price,
          high: trade.price,
          low: trade.price,
          close: trade.price,
          volume: trade.size,
        });
      } else {
        const candle = ohlcvMap.get(timestamp);
        candle.high = Math.max(candle.high, trade.price);
        candle.low = Math.min(candle.low, trade.price);
        candle.close = trade.price;
        candle.volume += trade.size;
      }
    });

    const candleData = Array.from(ohlcvMap.values());
    const volumeData = candleData.map(candle => ({
      time: candle.time,
      value: candle.volume,
      color: candle.close >= candle.open ? '#26a69a' : '#ef5350',
    }));

    // Update the chart data
    chartRef.current.candlestickSeries.setData(candleData);
    chartRef.current.volumeSeries.setData(volumeData);

    // Fit the content
    chartRef.current.chart.timeScale().fitContent();
  }, [trades]);

  return (
    <Box ref={chartContainerRef} w="100%" h="400px" />
  );
}

export default PriceChart;
