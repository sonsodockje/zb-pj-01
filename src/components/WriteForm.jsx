import React, { useState, useRef, useEffect } from 'react';
import { productUpload, productUpdate } from '../api/firebaseStore'; // productUpdate 추가
import { uploadProductImage } from '../api/firebaseStorage';
import { useNavigate } from 'react-router-dom';
import resizeImage from '../utils/resizeImage';
import IsOpen from './IsOpen';
import FormFilter from './FormFilter';

const handleImageSelection = async (
    e,
    currentSelectedFiles,
    setPreviewImgUrls,
    setSelectedFiles,
) => {
    // 사진 개수 제한
    const MAX_IMAGES = 4;

    // 1. 사진 파일 배열 만듦.
    const newImageFiles = Array.from(e.target.files).filter((file) =>
        file.type.startsWith('image/'),
    );

    // 2. 이미지 개수 체크함.
    const totalImages = currentSelectedFiles.length + newImageFiles.length;
    if (totalImages > MAX_IMAGES) {
        alert(
            `사진은 최대 ${MAX_IMAGES}장까지 업로드할 수 있습니다. 이미지가 너무 많습니다.`,
        );
        e.target.value = '';
        return;
        // 실행취소
    }

    // 3. 리사이징 함수를 실행함.
    const processedFilesPromises = newImageFiles.map(async (file) => {
        try {
            const big = await resizeImage(file, 980);
            const small = await resizeImage(file, 300);

            return {
                original: new File([big], file.name, { type: file.type }),
                resized: new File([small], file.name, { type: file.type }),
                isExisting: false,
            };
        } catch (error) {
            console.error(`Error resizing image ${file.name}:`, error);
            return null;
        }
    });

    // 4. 리사이징 실행후 정상적인 것들만 필터함.
    const processedFiles = (await Promise.all(processedFilesPromises)).filter(
        Boolean,
    );

    // 5. 미리보기 이미지 링크 배열에 삭은 사진 넣음
    const newPreviewUrls = processedFiles.map((filePair) =>
        URL.createObjectURL(filePair.resized),
    );

    // 6. 미리보기 상태 업데이트
    setPreviewImgUrls((prevUrls) => [...prevUrls, ...newPreviewUrls]);

    // 7. store에 저장될 상태 업데이트
    // original, resized, isExisting 들어감.
    setSelectedFiles((prevFiles) => [...prevFiles, ...processedFiles]);

    // 8. 초기화
    e.target.value = '';
};

const handleRemoveImage = (
    indexToRemove,
    previewImgUrls,
    setPreviewImgUrls,
    setSelectedFiles,
    currentSelectedFiles,
) => {
    // URL.revokeObjectURL은 새로 추가된 이미지에 대해서만 호출
    if (!currentSelectedFiles[indexToRemove].isExisting) {
        URL.revokeObjectURL(previewImgUrls[indexToRemove]);
    }
    setPreviewImgUrls((prevUrls) =>
        prevUrls.filter((_, idx) => idx !== indexToRemove),
    );
    setSelectedFiles((prevFiles) =>
        prevFiles.filter((_, idx) => idx !== indexToRemove),
    );
};

export default function WriteForm({ currentUser, id, initialData }) {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    const [previewImgUrls, setPreviewImgUrls] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);

    const [formData, setFormData] = useState({
        title: '',
        user: currentUser.displayName,
        userPhoto: currentUser.photoURL,
        imgs: [],
        body: '',
        uid: currentUser.uid,
        timestamp: new Date(),
        price: 0,
        want: '',
        sell: '',
        opened: true,
        soldOut: false,
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title || '',
                user: initialData.user || currentUser.displayName,
                userPhoto: initialData.userPhoto || currentUser.photoURL,
                body: initialData.body || '',
                uid: initialData.uid || currentUser.uid,
                timestamp: initialData.timestamp || new Date(),
                price: initialData.price || 0,
                want: initialData.want || '',
                sell: initialData.sell || '',
                opened: initialData.opened,
                soldOut: initialData.soldOut,
            });

            if (initialData.imgs && initialData.imgs.length > 0) {
                const initialPreviewUrls = initialData.imgs.map(
                    (img) => img.resized,
                );
                setPreviewImgUrls(initialPreviewUrls);
                setSelectedFiles(
                    initialData.imgs.map((img) => ({
                        original: img.original,
                        resized: img.resized,
                        isExisting: true,
                    })),
                );
            }
        } else {
            // 새 글 작성 시 폼 초기화
            setFormData({
                title: '',
                user: currentUser.displayName,
                userPhoto: currentUser.photoURL,
                imgs: [],
                body: '',
                uid: currentUser.uid,
                timestamp: new Date(),
                price: 0,
                want: '',
                sell: '',
                opened: true,
                soldOut: false,
            });
            setPreviewImgUrls([]);
            setSelectedFiles([]);
        }
    }, [initialData, currentUser]);

    const fileInputRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) {
            alert('현재 작업 처리 중입니다. 잠시만 기다려주세요.');
            return;
        }
        if (selectedFiles.length === 0) {
            alert('상품 이미지를 1개 이상 선택해야 합니다.');
            return;
        }
        setIsLoading(true);
        try {
            const uploadedUrls = await Promise.all(
                selectedFiles.map(async (filePair) => {
                    if (filePair.isExisting) {
                        return {
                            original: filePair.original,
                            resized: filePair.resized,
                        };
                    } else {
                        const originalURL = await uploadProductImage(
                            filePair.original,
                            'products/imgs/original/',
                        );
                        const resizedURL = await uploadProductImage(
                            filePair.resized,
                            'products/imgs/resized/',
                        );
                        return { original: originalURL, resized: resizedURL };
                    }
                }),
            );

            const finalFormData = {
                ...formData,
                imgs: uploadedUrls,
            };

            if (id) {
                // 기존 게시물 업데이트
                await productUpdate(id, finalFormData, setIsLoading, navigate);
            } else {
                // 새 게시물 업로드
                await productUpload(finalFormData, setIsLoading, navigate);
            }
        } catch (error) {
            console.error('상품 처리 중 오류 발생:', error);
            alert('상품 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <form className='w-full relative' onSubmit={handleSubmit}>
                <section>
                    <input
                        type='text'
                        className='input validator w-full'
                        required
                        minLength='1'
                        onChange={(e) => {
                            setFormData((prevFormData) => ({
                                ...prevFormData,
                                title: e.target.value,
                            }));
                        }}
                        value={formData.title}
                    />
                    <p className='validator-hint'>1자 이상</p>
                </section>

                <section className='flex w-full gap-1 mb-4'>
                    {previewImgUrls.length > 0 ? (
                        previewImgUrls.map((url, index) => (
                            <div key={index} className='relative'>
                                <img
                                    src={url}
                                    alt={`미리보기 이미지 ${index + 1}`}
                                    className='w-[200px] aspect-square ring-indigo-800 object-cover rounded-md'
                                />
                                <button
                                    onClick={() =>
                                        handleRemoveImage(
                                            index,
                                            previewImgUrls,
                                            setPreviewImgUrls,
                                            setSelectedFiles,
                                            selectedFiles,
                                        )
                                    }
                                    className='absolute top-0.5 right-0.5 bg-black bg-opacity-60 text-white border-none rounded-full w-5 h-5 flex items-center justify-center cursor-pointer text-sm'
                                    type='button' // 폼 제출 방지
                                >
                                    X
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className='w-full h-[200px] mb-4 bg-base-200 rounded-2xl text-sm text-center flex items-center justify-center'>
                            선택된 이미지가 없습니다.
                        </div>
                    )}
                </section>

                <section>
                    <input
                        type='file'
                        className='file-input file-input-md w-full mb-7 hidden'
                        accept='image/*'
                        multiple
                        onChange={(e) =>
                            handleImageSelection(
                                e,
                                selectedFiles,
                                setPreviewImgUrls,
                                setSelectedFiles,
                            )
                        }
                        ref={fileInputRef}
                    />
                    <button
                        className='btn w-full mb-7'
                        onClick={() => {
                            fileInputRef.current.click();
                        }}
                        type='button' // 폼 제출을 방지하기 위해 type을 button으로 지정
                        disabled={isLoading} // 로딩 중일 때 이미지 선택 버튼 비활성화
                    >
                        사진 선택
                    </button>
                </section>

                <section>
                    <textarea
                        className='textarea validator w-full resize-none rounded-lg'
                        placeholder='설명을 작성해주세요.'
                        minLength='2'
                        required
                        maxLength='500'
                        onChange={(e) => {
                            setFormData((prevFormData) => ({
                                ...prevFormData,
                                body: e.target.value,
                            }));
                        }}
                        value={formData.body} // controlled component
                    ></textarea>
                    <p className='validator-hint'>2자 이상</p>
                </section>

                <div className='flex'>
                    <input
                        type='number'
                        className='input validator w-full'
                        required
                        placeholder='가격'
                        min='0'
                        max='6000000'
                        title='Must be between 1 to 6,000,000'
                        onChange={(e) => {
                            setFormData((prevFormData) => ({
                                ...prevFormData,
                                price: parseInt(e.target.value) || 0,
                            }));
                        }}
                        // controlled component
                    />
                    <p className='rounded-sm bg-base-100 p-2 px-4 ml-1'>원</p>
                </div>
                <p className='validator-hint '>상품 가격을 입력해주세요.</p>
                <section>
                    <p>판매팀</p>
                    <FormFilter type='sell' setFormData={setFormData} />
                    <p>희망팀</p>
                    <FormFilter type='want' setFormData={setFormData} />
                </section>

                <IsOpen formData={formData} setFormData={setFormData} />

                <div className='flex gap-1 justify-end'>
                    <button className='btn' type='reset'>
                        취소
                    </button>
                    <button
                        className='btn btn-accent'
                        type='submit'
                        disabled={isLoading} // 로딩 중일 때 제출 버튼 비활성화
                    >
                        {isLoading ? '저장 중...' : '저장'}
                    </button>
                </div>
            </form>
        </>
    );
}
