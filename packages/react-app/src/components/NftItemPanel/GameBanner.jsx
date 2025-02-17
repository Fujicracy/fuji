import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import FilterHdrIcon from '@material-ui/icons/FilterHdr';
import axios from 'axios';
import { formatUnits } from '@ethersproject/units';
import { Flex } from 'rebass';
import { fujiMedia, API_BASE_URI, NFT_GAME_POINTS_DECIMALS } from 'consts';
import { useAuth, useContractLoader, useProfileInfo } from 'hooks';
import { Transactor } from 'helpers';
import { happyIcon } from 'assets/images';
import { ResultPopup } from 'components';
import { useHistory } from 'react-router-dom';

const Container = styled.div`
  // Hard coded with to match container width on borrow & my positions
  max-width: calc(1136px - 2 * 24px);
  margin: 0 auto;
  background: linear-gradient(92.29deg, #fe3477 0%, #f0014f 100%);
  box-shadow: 0px 0px 8px #f0014f;
  backdrop-filter: blur(6px);
  border-radius: 8px;
  color: white;
  padding: 1rem;

  display: flex;
  align-items: center;
  justify-content: space-between;

  ${fujiMedia.lessThan('medium')`
    padding: 1rem .5rem;
  `}

  ${fujiMedia.lessThan('small')`
    display: block;
    border-radius: 0px;
    text-align: center;
  `}
`;

const ContentContainer = styled.div`
  margin: 0 16px;

  ${fujiMedia.lessThan('medium')`
    width: 100%;
    margin: 0;
  `}
`;

const Title = styled.p`
  font-family: 'Poppins';
  font-style: normal;
  font-weight: 600;
  font-size: 16px;
`;

const Text = styled.p`
  font-family: 'Poppins';
  font-style: normal;
  font-weight: 400;
  margin-top: 0.5rem;
  font-size: 14px;
  line-height: 120%;
`;

const Cta = styled.button`
  background: linear-gradient(287.45deg, rgba(0, 0, 0, 0) 6.81%, #000000 120.29%);
  border-radius: 6px;
  border: 1px solid black;
  padding: 0.5rem 2rem;
  color: white;
  font-weight: bold;
  cursor: pointer;
  width: 260px;

  transition: 0.3s all;

  :not([disabled]):hover {
    border: 3px solid black;
  }

  &[disabled] {
    cursor: wait;
  }

  ${fujiMedia.lessThan('medium')`
    width: 100%;
    margin-top: 1rem;
    width: 200px;
  `}
`;

const Icon = styled(FilterHdrIcon)`
  ${fujiMedia.lessThan('medium')`
    display: none;  
  `}
`;

const content = {
  text: {
    'no-points': 'The more you borrow, the higher you climb.',
    'claimable-points':
      'You are already climbing Fuji by having opened a position. You need to claim your meter points now.',
  },
  cta: {
    'no-points': 'Go to Campaign',
    'claimable-points': 'Claim your points',
  },
};

const useBannerStatus = () => {
  // 'no-points', 'claimable-points', 'claimed-points'
  const [status, setStatus] = useState('claimed-points');
  const { address, networkId } = useAuth();
  const { claimedPoints, isLoading } = useProfileInfo();

  useEffect(() => {
    async function fetchStatus() {
      try {
        await axios.get(`${API_BASE_URI}/rankings/${address}`, {
          params: {
            networkId,
            stage: 'initial',
          },
        });
        if (claimedPoints) {
          setStatus('claimed-points');
        } else {
          setStatus('claimable-points');
        }
      } catch (e) {
        console.log(e);
        setStatus('no-points');
      }
    }
    if (!isLoading) {
      fetchStatus();
    }
  }, [address, networkId, claimedPoints, isLoading]);

  return status;
};

const ACTION_RESULT = {
  NONE: 'none',
  SUCCESS: 'success',
  ERROR: 'error',
};

const ACTION_DESCRIPTIONS = {
  [ACTION_RESULT.SUCCESS]: {
    value: ACTION_RESULT.SUCCESS,
    title: 'Congratulation!',
    description:
      'You successfully claimed {amount} meter points! You can use them to buy crates or continue accumulating them by maintaining your position.',
    submitText: 'Go to Store',
    emotionIcon: happyIcon,
  },
  [ACTION_RESULT.ERROR]: {
    value: ACTION_RESULT.ERROR,
    title: 'Something is wrong',
    description: 'Oups, an error occured during the transaction!',
    submitText: 'Try again',
    emotionIcon: '',
  },
};

const GameBanner = () => {
  const status = useBannerStatus();
  const { address, networkId, provider, networkName } = useAuth();
  const tx = Transactor(provider);

  const history = useHistory();

  const [isLoading, setIsLoading] = useState(false);
  const [actionResult, setActionResult] = useState(ACTION_RESULT.NONE);

  const contracts = useContractLoader();

  const handleCta = async () => {
    setIsLoading(true);
    if (status === 'claimable-points') {
      const { data } = await axios.get(`${API_BASE_URI}/rankings/merkle-proofs`, {
        params: {
          networkId,
          address,
        },
      });
      try {
        const txRes = await tx(contracts.NFTGame.claimBonusPoints(data.pointsToClaim, data.proofs));
        console.log(txRes);

        if (txRes && txRes.hash) {
          await txRes.wait();
          ACTION_DESCRIPTIONS[ACTION_RESULT.SUCCESS].description = ACTION_DESCRIPTIONS[
            ACTION_RESULT.SUCCESS
          ].description.replace(
            '{amount}',
            formatUnits(data.pointsToClaim, NFT_GAME_POINTS_DECIMALS),
          );
          setActionResult(ACTION_RESULT.SUCCESS);
        }
      } catch (error) {
        console.error('minting inventory error:', { error });
        setActionResult(ACTION_RESULT.ERROR);
      }
    } else if (status === 'no-points') {
      history.push('/nft-game');
    }
    setIsLoading(false);
  };

  if (networkName !== 'fantom' && networkName !== 'rinkeby') {
    return <></>;
  }

  if (status === 'claimed-points' && actionResult === ACTION_RESULT.NONE) {
    return <></>;
  }

  return (
    <Container>
      <Flex>
        <Icon />
        <ContentContainer>
          <Title>The Fuji Climb is now live</Title>
          <Text>{content.text[status]}</Text>
        </ContentContainer>
      </Flex>
      <Cta onClick={handleCta} disabled={isLoading}>
        {isLoading ? 'Claiming...' : content.cta[status]}
      </Cta>
      <ResultPopup
        isOpen={actionResult !== ACTION_RESULT.NONE}
        content={ACTION_DESCRIPTIONS[actionResult] ?? {}}
        onSubmit={() => {
          setActionResult(ACTION_RESULT.NONE);
          history.push('/nft-game/store');
        }}
        onClose={() => setActionResult(ACTION_RESULT.NONE)}
      />
    </Container>
  );
};

export default GameBanner;
