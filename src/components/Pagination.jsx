import React from 'react';

// 총 페이지 계산,
// 현재 페이지 표시,
// 페이지 변경시 상태 변경,

export default function Pagination({ currentPage, totalPages, onPageChange }) {
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
    }

    return (
        <div className='join p-6'>
            {pageNumbers.map((number) => (
                <button
                    key={number}
                    onClick={() => onPageChange(number)}
                    className={`join-item btn ${number === currentPage ? 'btn-active' : ''}`}>
                    {number}
                </button>
            ))}
        </div>
    );
}
