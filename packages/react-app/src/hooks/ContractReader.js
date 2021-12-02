import { useState, useEffect, useRef } from 'react';
import usePoller from './Poller';

const DEBUG = false;

function validArgs(args) {
  if (!args || args.length === 0) {
    return false;
  }
  if (args.find(a => Array.isArray(a))) {
    return !args.find(a => a.includes('') || a.includes(null));
  }
  return !args.includes('') && !args.includes(null);
}

export default function useContractReader(
  contracts,
  contractName,
  functionName,
  args,
  pollTime,
  formatter,
) {
  let adjustPollTime = 4000;
  if (pollTime) {
    adjustPollTime = pollTime;
  } else if (!pollTime && typeof args === 'number') {
    // it's okay to pass poll time as last argument without args for the call
    adjustPollTime = args;
  }

  const isMounted = useRef(false);
  const [value, setValue] = useState('');

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  usePoller(
    async () => {
      if (contracts && contracts[contractName]) {
        try {
          let newValue;
          if (DEBUG) console.log('CALLING ', contractName, functionName, 'with args', args);
          if (validArgs(args)) {
            newValue = await contracts[contractName][functionName](...args);
            if (DEBUG)
              console.log(
                'contractName',
                contractName,
                'functionName',
                functionName,
                'args',
                args,
                'RESULT:',
                newValue,
              );
          } else if (!args || (args && args.length === 0)) {
            newValue = await contracts[contractName][functionName]();
          }
          if (formatter && typeof formatter === 'function') {
            newValue = formatter(newValue);
          }
          // console.log("GOT VALUE",newValue)
          if (isMounted.current && newValue !== value) {
            setValue(newValue);
          }
        } catch (e) {
          console.log(`Unsuccessfull call to ${contractName}`);
        }
      }
    },
    adjustPollTime,
    contracts,
  );

  return value;
}
