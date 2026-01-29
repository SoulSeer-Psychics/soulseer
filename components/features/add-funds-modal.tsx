import React, { useState } from 'react';
import { CreditCard, DollarSign, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAsyncOperation, useApi } from '@/lib/hooks';
import { formatCurrency } from '@/lib/utils';

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFunds: (amount: number, paymentMethodId?: string) => Promise<void>;
  currentBalance: string;
}

interface PaymentMethod {
  id: string;
  type: 'card';
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  isDefault: boolean;
}

const PRESET_AMOUNTS = [10, 25, 50, 100, 200];

export default function AddFundsModal({
  isOpen,
  onClose,
  onAddFunds,
  currentBalance,
}: AddFundsModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: '',
  });

  const { data: paymentMethods } = useApi<PaymentMethod[]>('/api/payments/methods');
  
  const {
    execute: processPayment,
    loading: processing,
    error: paymentError
  } = useAsyncOperation(async (finalAmount: number) => {
    await onAddFunds(finalAmount, selectedPaymentMethod || undefined);
  });

  const handleAmountSelect = (selectedAmount: number) => {
    setAmount(selectedAmount.toString());
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setAmount('');
  };

  const getFinalAmount = (): number => {
    if (customAmount) {
      return parseFloat(customAmount) || 0;
    }
    return parseFloat(amount) || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalAmount = getFinalAmount();
    
    if (finalAmount < 1) {
      return;
    }

    if (showCardForm) {
      // Handle new card processing
      // In production, this would integrate with Stripe Elements
      console.log('Processing new card:', cardDetails);
    }

    await processPayment(finalAmount);
    
    if (!paymentError) {
      onClose();
      setAmount('');
      setCustomAmount('');
      setSelectedPaymentMethod('');
      setShowCardForm(false);
      setCardDetails({ number: '', expiry: '', cvc: '', name: '' });
    }
  };

  const handleClose = () => {
    if (processing) return;
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent variant="mystical" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Add Funds to Account
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Balance */}
          <div className="text-center p-4 bg-slate-800/50 rounded-lg">
            <div className="text-sm text-slate-400 mb-1">Current Balance</div>
            <div className="text-2xl font-bold text-mystical-gold-400">
              {formatCurrency(parseFloat(currentBalance))}
            </div>
          </div>

          {/* Amount Selection */}
          <div className="space-y-4">
            <Label variant="mystical">Select Amount</Label>
            
            {/* Preset Amounts */}
            <div className="grid grid-cols-3 gap-3">
              {PRESET_AMOUNTS.map((presetAmount) => (
                <Button
                  key={presetAmount}
                  type="button"
                  variant={amount === presetAmount.toString() ? 'default' : 'outline'}
                  onClick={() => handleAmountSelect(presetAmount)}
                  className="p-4 h-auto"
                >
                  <div className="text-center">
                    <div className="font-semibold">
                      {formatCurrency(presetAmount)}
                    </div>
                    {presetAmount >= 50 && (
                      <div className="text-xs opacity-75">
                        +{Math.floor(presetAmount * 0.1)}% bonus
                      </div>
                    )}
                  </div>
                </Button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="space-y-2">
              <Label htmlFor="custom-amount" variant="mystical">
                Custom Amount
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  id="custom-amount"
                  variant="mystical"
                  type="number"
                  min="1"
                  max="1000"
                  step="0.01"
                  placeholder="Enter amount"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="space-y-4">
            <Label variant="mystical">Payment Method</Label>
            
            {/* Existing Payment Methods */}
            {paymentMethods && paymentMethods.length > 0 && (
              <div className="space-y-2">
                {paymentMethods.map((method) => (
                  <Card
                    key={method.id}
                    variant={selectedPaymentMethod === method.id ? 'cosmic' : 'mystical'}
                    className={`cursor-pointer transition-colors ${
                      selectedPaymentMethod === method.id ? 'ring-2 ring-mystical-gold-500' : ''
                    }`}
                    onClick={() => {
                      setSelectedPaymentMethod(method.id);
                      setShowCardForm(false);
                    }}
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-6 bg-slate-700 rounded flex items-center justify-center">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium capitalize">
                            {method.card.brand} •••• {method.card.last4}
                          </div>
                          <div className="text-sm text-slate-400">
                            {method.card.exp_month.toString().padStart(2, '0')}/{method.card.exp_year.toString().slice(2)}
                          </div>
                        </div>
                      </div>
                      {method.isDefault && (
                        <Badge variant="cosmic" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Add New Card Option */}
            <Card
              variant={showCardForm ? 'cosmic' : 'mystical'}
              className={`cursor-pointer transition-colors border-dashed ${
                showCardForm ? 'ring-2 ring-mystical-gold-500' : ''
              }`}
              onClick={() => {
                setShowCardForm(true);
                setSelectedPaymentMethod('');
              }}
            >
              <CardContent className="flex items-center justify-center p-6">
                <div className="text-center">
                  <CreditCard className="w-8 h-8 text-mystical-pink-400 mx-auto mb-2" />
                  <div className="font-medium">Add New Card</div>
                  <div className="text-sm text-slate-400">
                    Secure payment processing
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* New Card Form */}
            {showCardForm && (
              <div className="space-y-4 p-4 bg-slate-800/30 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="card-number" variant="mystical">
                    Card Number
                  </Label>
                  <Input
                    id="card-number"
                    variant="mystical"
                    placeholder="1234 5678 9012 3456"
                    value={cardDetails.number}
                    onChange={(e) => setCardDetails(prev => ({ ...prev, number: e.target.value }))}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="card-expiry" variant="mystical">
                      Expiry
                    </Label>
                    <Input
                      id="card-expiry"
                      variant="mystical"
                      placeholder="MM/YY"
                      value={cardDetails.expiry}
                      onChange={(e) => setCardDetails(prev => ({ ...prev, expiry: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="card-cvc" variant="mystical">
                      CVC
                    </Label>
                    <Input
                      id="card-cvc"
                      variant="mystical"
                      placeholder="123"
                      value={cardDetails.cvc}
                      onChange={(e) => setCardDetails(prev => ({ ...prev, cvc: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="card-name" variant="mystical">
                    Name on Card
                  </Label>
                  <Input
                    id="card-name"
                    variant="mystical"
                    placeholder="John Doe"
                    value={cardDetails.name}
                    onChange={(e) => setCardDetails(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          {getFinalAmount() > 0 && (
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-300">Amount to add:</span>
                <span className="font-semibold text-mystical-gold-400">
                  {formatCurrency(getFinalAmount())}
                </span>
              </div>
              {getFinalAmount() >= 50 && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300">Bonus ({Math.floor(getFinalAmount() * 0.1)}%):</span>
                  <span className="font-semibold text-green-400">
                    +{formatCurrency(getFinalAmount() * 0.1)}
                  </span>
                </div>
              )}
              <hr className="border-slate-600 my-2" />
              <div className="flex justify-between items-center">
                <span className="font-semibold text-white">New balance:</span>
                <span className="font-bold text-mystical-gold-400 text-lg">
                  {formatCurrency(
                    parseFloat(currentBalance) + 
                    getFinalAmount() + 
                    (getFinalAmount() >= 50 ? getFinalAmount() * 0.1 : 0)
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {paymentError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
              <p className="text-red-400 text-sm">{paymentError}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={processing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              loading={processing}
              disabled={
                getFinalAmount() < 1 || 
                (!selectedPaymentMethod && !showCardForm) ||
                (showCardForm && (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvc || !cardDetails.name))
              }
              className="flex-1"
            >
              Add {formatCurrency(getFinalAmount())}
            </Button>
          </div>

          {/* Security Notice */}
          <div className="text-center text-xs text-slate-400">
            <p>
              🔒 Payments are processed securely through Stripe. 
              Your card information is never stored on our servers.
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
