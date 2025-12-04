import React, { useState, useEffect } from 'react';

type PrivacyOption = 'everyone' | 'friends' | 'professors';

const PRIVACY_OPTIONS = [
    { value: 'everyone', label: 'Everyone (Friends & Professors)' },
    { value: 'friends', label: 'Friends Only' },
    { value: 'professors', label: 'Professors Only' },
];

const Settings = () => {
    const [notificationPrivacy, setNotificationPrivacy] = useState<PrivacyOption>('friends');

    const [statusMessage, setStatusMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isError, setIsError] = useState<boolean>(false);

    useEffect(() => {
        const fetchCurrentSetting = async () => {
            try {
                const response = await fetch('http://localhost:8000/api/settings/privacy');

                if (response.ok) {
                    const data = await response.json();
                    setNotificationPrivacy(data.notification_privacy as PrivacyOption);
                } else {
                    setStatusMessage('Could not load settings from server. (Check server logs)');
                    setIsError(true);
                }
            } catch (error) {
                setStatusMessage('Network error during settings load. Is the backend server running?');
                setIsError(true);
            }
        };
        fetchCurrentSetting();
    }, []);

    const handleSaveSettings = async (newValue: PrivacyOption) => {
        setIsLoading(true);
        setStatusMessage('');
        setIsError(false);
        setNotificationPrivacy(newValue);

        try {
            const response = await fetch('http://localhost:8000/api/settings/privacy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notification_privacy: newValue }),
            });

            if (response.ok) {
                const data = await response.json();
                setStatusMessage(`Settings saved successfully! Current setting: ${data.setting}`);
            } else {
                const errorData = await response.json();
                setStatusMessage(`Error saving settings: ${errorData.detail || 'Unknown server error'}`);
                setIsError(true);
            }
        } catch (error) {
            setStatusMessage('Network error. Could not connect to the server.');
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    };

    const statusClasses = isError ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-8 max-w-lg">
                <h1 className="text-3xl font-bold mb-8 text-foreground">⚙️ Settings</h1>

                <div className="bg-card p-6 rounded-lg border border-border shadow-lg">
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2 text-foreground">Notification Privacy</h2>

                    <fieldset className="space-y-4">
                        <legend className="sr-only">Notification Privacy Options</legend>
                        {PRIVACY_OPTIONS.map((option) => (
                            <div key={option.value} className="relative flex items-start">
                                <div className="flex items-center h-5">
                                    <input
                                        id={`privacy-${option.value}`}
                                        name="notification-privacy"
                                        type="radio"
                                        value={option.value}
                                        checked={notificationPrivacy === option.value}
                                        onChange={(e) => handleSaveSettings(e.target.value as PrivacyOption)}
                                        disabled={isLoading}
                                        className="focus:ring-primary h-4 w-4 text-primary border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                                    />
                                </div>
                                <div className="ml-3 text-sm">
                                    <label htmlFor={`privacy-${option.value}`} className="font-medium text-foreground cursor-pointer">
                                        {option.label}
                                    </label>
                                </div>
                            </div>
                        ))}
                    </fieldset>

                    {statusMessage && (
                        <p className={`mt-6 text-sm font-medium ${statusClasses}`}>
                            {statusMessage}
                        </p>
                    )}
                    {isLoading && (
                        <p className="mt-6 text-sm text-blue-500 dark:text-blue-400">
                            Saving settings...
                        </p>
                    )}
                    <p className="mt-6 text-xs text-muted-foreground">
                        **Current Persistent Setting:** <span className="font-semibold text-primary">{notificationPrivacy.toUpperCase()}</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Settings;