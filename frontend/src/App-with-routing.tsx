import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import CountdownBanner from './components/CountdownBanner'
import Hero from './sections/Hero'
import ProblemSolution from './sections/ProblemSolution'
import Pricing from './sections/Pricing'
import IntegratedCheckout from './sections/IntegratedCheckout'
import PaymentConfirmation from './components/PaymentConfirmation'
import ThankYou from './pages/ThankYou'
import { Order } from './utils/orderSystem'

function HomePage() {
  const [showCheckout, setShowCheckout] = useState(false)
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null)

  if (currentOrder) {
    return <PaymentConfirmation order={currentOrder} onClose={() => setCurrentOrder(null)} />
  }

  if (showCheckout) {
    return <IntegratedCheckout onOrderCreated={setCurrentOrder} onBack={() => setShowCheckout(false)} />
  }

  return (
    <div className="min-h-screen">
      <CountdownBanner />
      <Hero onCTAClick={() => setShowCheckout(true)} />
      <ProblemSolution />
      <Pricing onOrderClick={() => setShowCheckout(true)} />
    </div>
  )
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/thank-you" element={<ThankYou />} />
        <Route path="/payment-success" element={<ThankYou />} />
      </Routes>
    </Router>
  )
}

export default App