import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface RoninOathModalProps {
    open: boolean;
    onClose: () => void;
}

export function RoninOathModal({ open, onClose }: RoninOathModalProps) {
    const [imageError, setImageError] = useState(false);

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            if (!isOpen) onClose();
        }}>
            <DialogContent className="max-w-2xl max-h-[calc(100vh-4rem)] overflow-y-auto mt-8">
                <DialogHeader>
                    <DialogTitle className="text-2xl sm:text-3xl font-serif mb-4 sm:mb-6">
                        The Ronin Oath
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        A philosophical statement about the ronin way
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
                    {/* Illustration - hidden on very small screens */}
                    <div className="hidden sm:block flex-shrink-0 md:w-48">
                        {!imageError ? (
                            <img
                                src="/assets/philosophy/ronin-oath-illustration.svg"
                                alt="Ronin standing with purpose"
                                className="w-full max-h-48 md:max-h-none h-auto rounded object-contain"
                                onError={() => setImageError(true)}
                            />
                        ) : (
                            <div className="ronin-placeholder w-full aspect-square flex items-center justify-center text-sm text-muted-foreground">
                                [Ronin Illustration]
                            </div>
                        )}
                    </div>

                    {/* Oath Text */}
                    <div className="flex-1 space-y-2 sm:space-y-3 text-base sm:text-lg leading-relaxed">
                        <p className="font-serif font-bold">I am a ronin.</p>
                        <p>
                            <span className="italic">Masterless</span>, but not <span className="font-serif font-bold">rudderless</span>.
                        </p>
                        <p>
                            My <span className="italic">actions</span> are my <span className="font-serif font-bold">documentation</span>.
                        </p>
                        <p>
                            My <span className="italic">patterns</span> are my <span className="font-serif font-bold">teacher</span>.
                        </p>
                        <p>
                            I return to <span className="italic">forgotten work</span> <span className="font-serif font-bold">without dread</span>.
                        </p>
                        <p className="font-serif font-bold text-lg sm:text-xl mt-3 sm:mt-4">浪人之道</p>
                    </div>
                </div>

                {/* Continue Button */}
                <div className="mt-4 sm:mt-6 flex justify-end">
                    <Button
                        onClick={onClose}
                        className="bg-ronin-brass hover:bg-ronin-brass/90 font-serif text-base sm:text-lg px-6 sm:px-8"
                    >
                        Continue
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
