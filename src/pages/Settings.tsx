import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RoninOathModal } from '@/components/RoninOathModal';
import { ModeToggle } from '@/components/mode-toggle';
import { useSettingsStore } from '@/stores/settingsStore';
import { Eye, EyeOff, Check, X } from 'lucide-react';

export function Settings() {
    const [showOath, setShowOath] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const { apiKey, loadApiKey, saveApiKey, removeApiKey, testApiKey } = useSettingsStore();

    useEffect(() => {
        loadApiKey();
    }, [loadApiKey]);

    useEffect(() => {
        if (apiKey) {
            setApiKeyInput(apiKey);
        }
    }, [apiKey]);

    const handleSaveApiKey = async () => {
        setSaveStatus('saving');
        setErrorMessage('');

        try {
            const isValid = await testApiKey(apiKeyInput);

            if (!isValid) {
                setSaveStatus('error');
                setErrorMessage('Invalid API key. Please check your key and try again.');
                setTimeout(() => setSaveStatus('idle'), 3000);
                return;
            }

            const success = await saveApiKey(apiKeyInput);
            if (success) {
                setSaveStatus('success');
                setErrorMessage('');
                setTimeout(() => setSaveStatus('idle'), 3000);
            } else {
                setSaveStatus('error');
                setErrorMessage('Failed to save API key. Please try again.');
                setTimeout(() => setSaveStatus('idle'), 3000);
            }
        } catch (error) {
            setSaveStatus('error');
            // Show the actual error message from backend
            setErrorMessage(error instanceof Error ? error.message : String(error));
            setTimeout(() => setSaveStatus('idle'), 5000); // Longer timeout for error messages
        }
    };

    const handleRemoveApiKey = async () => {
        await removeApiKey();
        setApiKeyInput('');
    };

    return (
        <div className="p-8">
            <h2 className="text-3xl font-serif font-bold mb-6">Settings</h2>

            {/* API Configuration Section */}
            <section className="mb-8">
                <h3 className="text-xl font-serif font-bold mb-3">API Configuration</h3>
                <p className="text-muted-foreground mb-4">
                    Configure your OpenRouter API key for AI consulting features.
                </p>
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Input
                                type={showApiKey ? 'text' : 'password'}
                                placeholder="sk-or-v1-..." value={apiKeyInput}
                                onChange={(e) => setApiKeyInput(e.target.value)}
                                className="font-mono text-sm pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <Button
                            onClick={handleSaveApiKey}
                            disabled={!apiKeyInput || saveStatus === 'saving'}
                            className="font-serif"
                        >
                            {saveStatus === 'saving' && 'Saving...'}
                            {saveStatus === 'success' && <><Check className="h-4 w-4 mr-1" /> Saved</>}
                            {saveStatus === 'error' && <><X className="h-4 w-4 mr-1" /> Error</>}
                            {saveStatus === 'idle' && 'Save Key'}
                        </Button>
                        {apiKey && (
                            <Button
                                variant="outline"
                                onClick={handleRemoveApiKey}
                                className="font-serif"
                            >
                                Remove
                            </Button>
                        )}
                    </div>
                    {saveStatus === 'error' && errorMessage && (
                        <p className="text-sm text-red-500">
                            {errorMessage}
                        </p>
                    )}
                    {apiKey && (
                        <p className="text-sm text-green-600">
                            ✓ API key configured
                        </p>
                    )}
                </div>
            </section>

            {/* Appearance Section */}
            <section className="mb-8">
                <h3 className="text-xl font-serif font-bold mb-3">Appearance</h3>
                <p className="text-muted-foreground mb-4">
                    Choose your preferred color theme for Ronin.
                </p>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-sans">Theme:</span>
                    <ModeToggle />
                </div>
            </section>

            {/* Philosophy Section */}
            <section className="mb-8">
                <h3 className="text-xl font-serif font-bold mb-3">Philosophy</h3>
                <p className="text-muted-foreground mb-4">
                    View the Ronin Oath that you saw when you started your journey.
                </p>
                <Button
                    variant="outline"
                    onClick={() => setShowOath(true)}
                    className="font-serif"
                >
                    View Ronin Oath
                </Button>
            </section>

            {/* Future settings sections will go here */}
            <p className="text-sm text-muted-foreground border-t pt-4">
                More settings will be available here in future releases.
            </p>

            {/* Ronin Oath Modal */}
            <RoninOathModal open={showOath} onClose={() => setShowOath(false)} />
        </div>
    );
}
