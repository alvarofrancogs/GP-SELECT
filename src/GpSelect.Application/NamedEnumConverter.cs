using System.Text.Json;
using System.Text.Json.Serialization;

namespace GpSelect.Application;

public sealed class NamedEnumConverterFactory : JsonConverterFactory
{
    public override bool CanConvert(Type typeToConvert) => typeToConvert.IsEnum;

    public override JsonConverter CreateConverter(Type typeToConvert, JsonSerializerOptions options) =>
        (JsonConverter)Activator.CreateInstance(typeof(NamedEnumConverter<>).MakeGenericType(typeToConvert))!;

    private sealed class NamedEnumConverter<T> : JsonConverter<T> where T : struct, Enum
    {
        private static readonly string[] Names = Enum.GetNames<T>();

        public override T Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType != JsonTokenType.String)
                throw new JsonException($"Expected a declared name of {typeof(T).Name}.");

            var text = reader.GetString();
            foreach (var name in Names)
            {
                if (string.Equals(text, name, StringComparison.OrdinalIgnoreCase))
                    return Enum.Parse<T>(name);
            }

            throw new JsonException($"Expected a declared name of {typeof(T).Name}.");
        }

        public override void Write(Utf8JsonWriter writer, T value, JsonSerializerOptions options)
        {
            var name = Enum.GetName(value);
            if (name is null) throw new JsonException($"Undefined value of {typeof(T).Name}.");
            writer.WriteStringValue(name);
        }
    }
}

public static class ApiJsonOptions
{
    public static void Configure(JsonSerializerOptions options)
    {
        options.Converters.Add(new NamedEnumConverterFactory());
        options.Converters.Add(new OptionalJsonConverterFactory());
    }
}
