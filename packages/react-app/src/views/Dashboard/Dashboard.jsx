import React, { useState, useEffect } from 'react'
import { Switch, Route, Redirect, useRouteMatch, Link, NavLink } from 'react-router-dom'
import {
  useContractLoader,
  useExternalContractLoader,
  useContractReader,
  useAuth,
} from '../../hooks'
import { DAI_ADDRESS, DAI_ABI, USDC_ADDRESS, USDC_ABI } from '../../constants'
import { getCollateralId } from '../../helpers'

import MyPositions from './MyPositions'
import ManagePosition from './ManagePosition'
import InitBorrow from './InitBorrow'
import Simulation from './Simulation'
import Error from '../Error'
import Loader from '../../components/Loader'

const CHAIN_ID = process.env.REACT_APP_CHAIN_ID

function Dashboard() {
  const { path } = useRouteMatch()
  const { address, provider, loadWeb3Modal, logoutOfWeb3Modal } = useAuth()

  const [logout, setLogout] = useState(false)
  const [loader, setLoader] = useState(true)

  const contracts = useContractLoader(provider)
  const DAIContract = useExternalContractLoader(provider, DAI_ADDRESS, DAI_ABI)
  const USDCContract = useExternalContractLoader(provider, USDC_ADDRESS, USDC_ABI)
  if (contracts) {
    contracts.DAI = DAIContract
    contracts.USDC = USDCContract
  }

  const collateralBalanceDai = useContractReader(contracts, 'FujiERC1155', 'balanceOf', [
    address,
    getCollateralId('DAI'),
  ])

  const collateralBalanceUsdc = useContractReader(contracts, 'FujiERC1155', 'balanceOf', [
    address,
    getCollateralId('USDC'),
  ])

  useEffect(() => {
    setTimeout(() => {
      return setLoader(false)
    }, 2000)
  }, [])

  const header = () => {
    return (
      <header>
        <Link to="/" className="logo">
          <img alt="logo" src="/logo-title.svg" />
        </Link>

        <nav>
          <ul>
            {address ? (
              <>
                <li className="nav-item">
                  <NavLink to="/dashboard/init-borrow" activeClassName="current">
                    Borrow
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/dashboard/my-positions" activeClassName="current">
                    My positions
                  </NavLink>
                </li>
              </>
            ) : (
              ''
            )}
            <li>
              <a
                href="/"
                onClick={() => {
                  return !address ? loadWeb3Modal() : logoutOfWeb3Modal()
                }}
                onMouseEnter={() => {
                  return setLogout(true)
                }}
                onMouseLeave={() => {
                  return setLogout(false)
                }}
                className={address ? 'button-nav connected' : 'button-nav'}
              >
                {!address && 'Connect Wallet'}
                {address && logout
                  ? 'Disconnect'
                  : address.substr(0, 6) + '...' + address.substr(-4, 4)}
              </a>
            </li>
          </ul>
        </nav>
      </header>
    )
  }

  const footer = () => {
    return (
      <footer>
        <nav className="footer-socials">
          <ul>
            <li>
              <a href="https://twitter.com/FujiFinance" target="_blank" rel="noopener noreferrer">
                <img src="/twitter_1.svg" alt="twitter" />
              </a>
            </li>
            <li>
              <a
                href="https://t.me/joinchat/U4cKWNCUevKVsrtY"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src="/telegram_1.svg" alt="telegram" />
              </a>
            </li>
            <li>
              <a
                href="https://discord.com/invite/dnvJeEMeDJ"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src="/discord_1.svg" alt="discord" />
              </a>
            </li>
          </ul>
        </nav>

        <nav className="footer-links">
          <ul>
            <li>© Fuji DAO 2021</li>
          </ul>
        </nav>
      </footer>
    )
  }

  const getProtectedRoute = () => {
    if (!collateralBalanceDai || !collateralBalanceUsdc) {
      return <Loader />
    }
    if (collateralBalanceDai.gt(0) || collateralBalanceUsdc.gt(0)) {
      return <Redirect to="/dashboard/my-positions" />
    }

    return <Redirect to="/dashboard/init-borrow" />
  }

  return (
    <>
      {header()}
      {loader ? (
        <Loader />
      ) : (
        <>
          <Switch>
            <ProtectedRoute exact path={`${path}`}>
              {getProtectedRoute()}
            </ProtectedRoute>
            <ProtectedRoute path={`${path}/simulation`}>
              <Simulation contracts={contracts} address={address} />
            </ProtectedRoute>
            <ProtectedRoute path={`${path}/init-borrow`}>
              <InitBorrow contracts={contracts} provider={provider} address={address} />
            </ProtectedRoute>
            <ProtectedRoute path={`${path}/my-positions`}>
              <MyPositions contracts={contracts} address={address} />
            </ProtectedRoute>
            <ProtectedRoute path={`${path}/position`}>
              <ManagePosition contracts={contracts} provider={provider} address={address} />
            </ProtectedRoute>
            <Route path={`${path}/:errorType`}>
              <Error />
            </Route>
          </Switch>
          {footer()}
        </>
      )}
    </>
  )
}

function ProtectedRoute({ children, ...rest }) {
  const { address } = useAuth()

  const [chainId, setChainId] = useState(Number(window.ethereum ? window.ethereum.chainId : null))

  useEffect(() => {
    if (window.ethereum && window.ethereum.on) {
      window.ethereum.on('chainChanged', chainID => {
        setChainId(Number(chainID))
      })
    }
  }, [chainId])

  const renderRoutes = ({ location }) => {
    if (chainId !== Number(CHAIN_ID)) {
      return <Redirect to="/dashboard/wrong-network" />
    }

    return address ? (
      children
    ) : (
      <Redirect
        to={{
          pathname: '/dashboard/not-connected',
          state: { from: location },
        }}
      />
    )
  }

  return <Route {...rest} render={renderRoutes} />
}

export default Dashboard
