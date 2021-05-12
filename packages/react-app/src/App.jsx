import React from 'react'
import { BrowserRouter, Switch, Route } from 'react-router-dom'
import './App.css'
import { ProvideAuth } from './hooks'

import Home from './views/Home'
import Dashboard from './views/Dashboard/Dashboard'
import Infos from './views/Infos'
import Team from './views/Team'
import Error from './views/Error'

const App = () => {
  return (
    <BrowserRouter>
      <Switch>
        <Route exact path="/">
          <Home />
        </Route>
        <Route path="/dashboard">
          <ProvideAuth>
            <Dashboard />
          </ProvideAuth>
        </Route>
        <Route path="/team">
          <Team />
        </Route>
        <Route path="/about">
          <Infos />
        </Route>
        <Route path="*">
          <Error />
        </Route>
      </Switch>
      <div className="bg-effect" />
      <div className="ohno">
        Oh no!
        <br />
        This website isn&apos;t available (yet) on mobile
      </div>
    </BrowserRouter>
  )
}

export default App
