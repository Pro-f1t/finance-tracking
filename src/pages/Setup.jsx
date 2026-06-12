import { useState } from 'react';
import { useFinance } from '../store';
import { Card, Input, Label, Button } from '../components/ui';
import BorderGlow from '../components/BorderGlow';

export default function Setup() {
  const { actions } = useFinance();
  const [amount, setAmount] = useState('1000');
  const [day, setDay] = useState('1');
  const [balance, setBalance] = useState('');

  const submit = (e) => {
    e.preventDefault();
    actions.completeSetup({
      paydayAmount: parseFloat(amount) || 0,
      paydayDay: Math.min(Math.max(parseInt(day) || 1, 1), 31),
      startingBalance: parseFloat(balance) || 0,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <BorderGlow
        animated
        backgroundColor="#0f1322"
        borderRadius={24}
        glowColor="224 80 65"
        colors={['#2E5BFF', '#002FA7', '#4d6bfe']}
        className="w-full max-w-md"
      >
        <form onSubmit={submit} className="p-8">
          <h1 className="text-2xl font-semibold mb-1">
            <span className="text-[#4d6bfe]">$</span> Welcome
          </h1>
          <p className="text-sm text-white/40 mb-6">
            Quick setup — this creates your main checking account and sets up your monthly payday.
          </p>

          <div className="space-y-4">
            <div>
              <Label>How much do you get paid each month?</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000"
                required
              />
            </div>
            <div>
              <Label>What day of the month? (1–31)</Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Current balance in your main account</Label>
              <Input
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full mt-6">
            Start tracking
          </Button>
        </form>
      </BorderGlow>
    </div>
  );
}
