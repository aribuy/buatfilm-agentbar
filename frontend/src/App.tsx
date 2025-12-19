import React, { useState } from 'react'
import CountdownBanner from './components/CountdownBanner'
import Hero from './sections/Hero'
import ProblemSolution from './sections/ProblemSolution'
import Pricing from './sections/Pricing'
import IntegratedCheckout from './sections/IntegratedCheckout'
import PaymentConfirmation from './components/PaymentConfirmation'
import { Order } from './utils/orderSystem'

function App() {
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

export default App