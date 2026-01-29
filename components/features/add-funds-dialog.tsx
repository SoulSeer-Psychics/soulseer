import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { DollarSign, CreditCard, AlertCircle, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface AddFundsDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (amount: number) => void;
  currentBalance: number;
}

const PRESET_AMOUNTS = [10, 25, 50, 100];

function PaymentForm({ 
  amount, 
  onSuccess, 
  onClose 
}: { 
  amount: number; 
  onSuccess: (amount: number) => void; 
  onClose: () => void; 
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setError('Card information is required');
      setLoading(false);
      return;
    }

    try {
      // Create payment method
      const { error: paymentError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (paymentError) {
        setError(paymentError.message || 'An error occurred');
        setLoading(false);
        return;
      }

      // Call our API to process the payment
      const response = await fetch('/api/payments/add-funds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          paymentMethodId: paymentMethod.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Payment failed');
      }

      // Handle payment intent if needed
      if (result.clientSecret) {
        const { error: confirmError } = await stripe.confirmCardPayment(
          result.clientSecret
        );

        if (confirmError) {
          throw new Error(confirmError.message || 'Payment confirmation failed');
        }
      }

      // Success
      toast.success(`Successfully added ${formatCurrency(amount)} to your balance`);
      onSuccess(amount);
      onClose();
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Amount Display */}
      <div className="bg-cosmic-800/50 rounded-lg p-4 text-center">
        <p className="text-slate-400 text-sm mb-2">Adding to your balance</p>
        <p className="text-2xl font-bold text-mystical-gold-400">
          {formatCurrency(amount)}
        </p>
      </div>

      {/* Card Input */}
      <div className="space-y-2">
        <Label>Card Information</Label>
        <div className="p-3 border border-slate-600 rounded-md bg-slate-800 focus-within:border-mystical-pink-500 transition-colors">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#ffffff',
                  '::placeholder': {
                    color: '#94a3b8',
                  },
                  iconColor: '#ec4899',
                },
                invalid: {
                  color: '#ef4444',
                  iconColor: '#ef4444',
                },
              },
              hidePostalCode: true,
            }}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-md p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Security Note */}
      <div className="text-center text-xs text-slate-500">
        🔒 Your payment information is secure and encrypted
      </div>

      {/* Actions */}
      <div className="flex space-x-3 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          className="flex-1"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={loading}
          disabled={!stripe || loading}
          className="flex-1"
        >
          {loading ? (
            'Processing...'
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Add {formatCurrency(amount)}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default function AddFundsDialog({ 
  open, 
  onClose, 
  onSuccess, 
  currentBalance 
}: AddFundsDialogProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [step, setStep] = useState<'amount' | 'payment'>('amount');

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const getSelectedAmount = () => {
    if (selectedAmount) return selectedAmount;
    if (customAmount) return parseFloat(customAmount);
    return 0;
  };

  const isValidAmount = () => {
    const amount = getSelectedAmount();
    return amount >= 1 && amount <= 500;
  };

  const handleContinue = () => {
    if (isValidAmount()) {
      setStep('payment');
    }
  };

  const handleBack = () => {
    setStep('amount');
  };

  const handleClose = () => {
    setStep('amount');
    setSelectedAmount(null);
    setCustomAmount('');
    onClose();
  };

  const handlePaymentSuccess = (amount: number) => {
    handleClose();
    onSuccess(amount);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent variant="cosmic" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            {step === 'amount' ? 'Add Funds' : 'Payment Information'}
          </DialogTitle>
        </DialogHeader>

        {step === 'amount' ? (
          <div className="space-y-6">
            {/* Current Balance */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-1">Current Balance</p>
                <p className="text-xl font-bold text-mystical-gold-400">
                  {formatCurrency(currentBalance)}
                </p>
              </div>
            </div>

            {/* Preset Amounts */}
            <div className="space-y-3">
              <Label>Select Amount</Label>
              <div className="grid grid-cols-2 gap-3">
                {PRESET_AMOUNTS.map((amount) => (
                  <Button
                    key={amount}
                    variant={selectedAmount === amount ? 'default' : 'outline'}
                    onClick={() => handleAmountSelect(amount)}
                    className="h-12"
                  >
                    {formatCurrency(amount)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div className="space-y-2">
              <Label>Or Enter Custom Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  min="1"
                  max="500"
                  step="0.01"
                  placeholder="0.00"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:border-mystical-pink-500 focus:outline-none"
                />
              </div>
              <p className="text-xs text-slate-500">
                Minimum: $1.00 • Maximum: $500.00
              </p>
            </div>

            {/* Continue Button */}
            <div className="flex space-x-3 pt-4">
              <Button
                variant="ghost"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleContinue}
                disabled={!isValidAmount()}
                className="flex-1"
              >
                Continue
                <Check className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Benefits */}
            <div className="bg-mystical-pink-500/10 border border-mystical-pink-500/20 rounded-lg p-4 text-center">
              <p className="text-mystical-pink-400 text-sm font-medium mb-2">
                ✨ Why Add Funds?
              </p>
              <div className="text-xs text-slate-300 space-y-1">
                <p>• Instant access to readings</p>
                <p>• No interruptions during sessions</p>
                <p>• Secure prepaid system</p>
                <p>• Only pay for time used</p>
              </div>
            </div>
          </div>
        ) : (
          <Elements stripe={stripePromise}>
            <PaymentForm
              amount={getSelectedAmount()}
              onSuccess={handlePaymentSuccess}
              onClose={handleBack}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}
