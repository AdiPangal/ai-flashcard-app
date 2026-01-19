import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text} from 'react-native';
import Animated, {
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type FileItem = {
    id: string;
    name: string;
    uri: string;
    type: 'pdf' | 'image';
    size?: number;
}

type Props = {
    onFilesSelected: (files: FileItem[]) => void;
    fileCount: number;
}

export default function FileUploadButton({onFilesSelected, fileCount}: Props){
    const { colors } = useTheme();
    const pressProgress = useSharedValue(0);
    const [cameraPermission, setCameraPermission] = useState<ImagePicker.PermissionStatus | null>(null);
    
    const handlePressIn = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        pressProgress.value = withTiming(1, { duration: 100 });
    }, []);
    
    const handlePressOut = useCallback(() => {
        pressProgress.value = withTiming(0, { duration: 100 });
    }, []);
    
    // Check camera permission status on mount
    useEffect(() => {
        (async () => {
            const { status } = await ImagePicker.getCameraPermissionsAsync();
            setCameraPermission(status);
        })();
    }, []);
    
    const requestCameraPermission = async (): Promise<boolean> => {
        if (cameraPermission === ImagePicker.PermissionStatus.GRANTED) {
            return true;
        }
        
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        setCameraPermission(status);
        
        if (status !== ImagePicker.PermissionStatus.GRANTED) {
            Alert.alert(
                'Camera Permission Required',
                'Please enable camera access in your device settings to take photos.',
                [{ text: 'OK' }]
            );
            return false;
        }
        
        return true;
    };
    
    const animatedButtonStyle = useAnimatedStyle(() => {
        const translateY = pressProgress.value * 2;
        const backgroundColor = interpolateColor(
            pressProgress.value,
            [0, 1],
            [colors.backgroundSecondary, colors.backgroundLighter]
        );
        
        return {
            transform: [{ translateY }],
            backgroundColor,
        };
    });
    
    const handleFileUpload = async () => {
        try {
            Alert.alert(
                'Select Files',
                'Choose how you want to upload files',
                [
                    {
                        text: 'PDF',
                        onPress: async () => {
                            try {
                                const result = await DocumentPicker.getDocumentAsync({
                                    type: ['application/pdf'],
                                    copyToCacheDirectory: true,
                                    multiple: true,
                                });
                                
                                if (!result.canceled && result.assets) {
                                    const files: FileItem[] = result.assets.map((asset) => ({
                                        id: `${Date.now()}-${Math.random()}`,
                                        name: asset.name || 'document.pdf',
                                        uri: asset.uri,
                                        type: 'pdf',
                                        size: asset.size,
                                    }));
                                    onFilesSelected(files);
                                }
                            } catch (error) {
                                console.error('Error picking document:', error);
                            }
                        }
                    },
                    {
                        text: 'Photos',
                        onPress: async () => {
                            try {
                                const result = await ImagePicker.launchImageLibraryAsync({
                                    mediaTypes: 'images',
                                    allowsMultipleSelection: true,
                                    quality: 1,
                                });
                                
                                if (!result.canceled && result.assets) {
                                    const files: FileItem[] = result.assets.map((asset, index) => ({
                                        id: `${Date.now()}-${index}`,
                                        name: asset.fileName || `image-${index}.jpg`,
                                        uri: asset.uri,
                                        type: 'image',
                                        size: asset.fileSize,
                                    }));
                                    onFilesSelected(files);
                                }
                            } catch (error) {
                                console.error('Error picking image:', error);
                            }
                        }
                    },
                    {
                        text: 'Camera',
                        onPress: async () => {
                            try {
                                // Request camera permission before launching camera
                                const hasPermission = await requestCameraPermission();
                                if (!hasPermission) {
                                    return;
                                }
                                
                                const result = await ImagePicker.launchCameraAsync({
                                    mediaTypes: 'images',
                                    quality: 1,
                                    allowsEditing: false,
                                });
                                
                                if (!result.canceled && result.assets[0]) {
                                    const file: FileItem = {
                                        id: `${Date.now()}`,
                                        name: result.assets[0].fileName || `photo-${Date.now()}.jpg`,
                                        uri: result.assets[0].uri,
                                        type: 'image',
                                        size: result.assets[0].fileSize,
                                    };
                                    onFilesSelected([file]);
                                }
                            } catch (error) {
                                console.error('Error taking photo:', error);
                                Alert.alert(
                                    'Error',
                                    'Failed to take photo. Please try again.',
                                    [{ text: 'OK' }]
                                );
                            }
                        }
                    },
                    {
                        text: 'Cancel',
                        style: 'cancel'
                    }
                ]
            );
        } catch (error) {
            console.error('Error in file upload:', error);
        }
    };
    
    return(
        <AnimatedPressable 
            style={[styles.button, { borderColor: colors.border }, animatedButtonStyle]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handleFileUpload}
        >
            <Ionicons name="cloud-upload-outline" size={20} color={colors.textPrimary} />
            <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
                Upload Notes{fileCount > 0 ? ` (${fileCount})` : ''}
            </Text>
        </AnimatedPressable>
    )
}

const styles = StyleSheet.create({
    button:{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        marginVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        gap: 8,
    },
    buttonText:{
        fontSize: 16,
        fontWeight: "bold",
        fontFamily: "Inter",
    },
})

