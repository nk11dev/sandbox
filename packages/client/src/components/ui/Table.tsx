import './Table.css'

interface TableColumn<T> {
    header: string
    accessor: keyof T | ((row: T) => React.ReactNode)
    width?: string
}

interface TableProps<T> {
    columns: TableColumn<T>[]
    data: T[]
    keyExtractor: (row: T) => string | number
}

/**
 * Reusable Table component with type-safe columns.
 */
export function Table<T>({ columns, data, keyExtractor }: TableProps<T>) {
    return (
        <div className="table-container">
            <table className="table">
                <thead>
                    <tr>
                        {columns.map((column, index) => (
                            <th
                                key={index}
                                className="table__header"
                                style={{ width: column.width }}
                            >
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row) => (
                        <tr key={keyExtractor(row)} className="table__row">
                            {columns.map((column, index) => (
                                <td key={index} className="table__cell">
                                    {typeof column.accessor === 'function'
                                        ? column.accessor(row)
                                        : String(row[column.accessor])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
