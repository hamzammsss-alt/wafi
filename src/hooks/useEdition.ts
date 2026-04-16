import { useEffect, useMemo, useState } from 'react';
import {
    AppEdition,
    getCurrentEdition,
    getEditionProfile,
    onEditionChange,
    setCurrentEdition
} from '../lib/edition';

export const useEdition = () => {
    const [edition, setEditionState] = useState<AppEdition>(getCurrentEdition());

    useEffect(() => {
        const unsubscribe = onEditionChange(setEditionState);
        return unsubscribe;
    }, []);

    const profile = useMemo(() => getEditionProfile(edition), [edition]);

    const setEdition = (next: AppEdition) => {
        setCurrentEdition(next);
        setEditionState(next);
    };

    return { edition, profile, setEdition };
};
