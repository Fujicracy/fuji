import { useState } from 'react';
import { usePoller } from 'eth-hooks';
import axios from 'axios';

export default function useGasPrice(speed) {
  const [gasPrice, setGasPrice] = useState();
  const loadGasPrice = async () => {
    axios
      .get('https://ethgasstation.info/json/ethgasAPI.json')
      .then(response => {
        const newGasPrice = response.data[speed || 'average'] * 100000000;
        if (newGasPrice !== gasPrice) {
          setGasPrice(newGasPrice);
        }
      })
      .catch(error => {
        return console.log(error);
      });
  };
  usePoller(loadGasPrice, 39999);
  return gasPrice;
}
